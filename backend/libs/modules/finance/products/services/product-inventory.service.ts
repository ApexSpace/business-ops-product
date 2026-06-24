import { HttpStatus, Injectable } from '@nestjs/common';
import {
  ProductInventoryAdjustmentType,
  ProductType,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CreateProductInventoryAdjustmentDto,
  ListProductInventoryQueryDto,
  ProductInventoryStateResponseDto,
} from '../dto/product-inventory.dto';
import { ProductInventoryRepository } from '../repositories/product-inventory.repository';
import { ProductRepository } from '../repositories/product.repository';
import { ProductVariantRepository } from '../repositories/product-variant.repository';
import {
  normalizeProductInventoryQuantityChange,
  ProductInventoryQuantityError,
} from '../utils/product-inventory-quantity.util';

@Injectable()
export class ProductInventoryService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly variantRepository: ProductVariantRepository,
    private readonly inventoryRepository: ProductInventoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async getState(
    businessId: string,
    productId: string,
    query: ListProductInventoryQueryDto,
  ): Promise<ProductInventoryStateResponseDto> {
    const product = await this.productRepository.findById(businessId, productId);
    if (!product) {
      throw new AppException(
        ErrorCode.PRODUCT_NOT_FOUND,
        'Product not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const { skip, take, page, limit } = getPaginationParams(query);
    const [adjustments, total] = await Promise.all([
      this.inventoryRepository.findManyByProduct(businessId, productId, {
        skip,
        take,
        variantId: query.variantId,
      }),
      this.inventoryRepository.countByProduct(
        businessId,
        productId,
        query.variantId,
      ),
    ]);

    let stockQuantity = product.stockQuantity;
    if (query.variantId) {
      const variant = await this.variantRepository.findById(
        businessId,
        query.variantId,
      );
      stockQuantity = variant?.stockQuantity ?? 0;
    } else if (product.productType === ProductType.VARIABLE) {
      stockQuantity = await this.variantRepository.sumStockByProduct(
        businessId,
        productId,
      );
    }

    return {
      productId,
      variantId: query.variantId ?? null,
      stockQuantity,
      trackInventory: product.trackInventory,
      adjustments: adjustments.map((adjustment) => ({
        id: adjustment.id,
        productId: adjustment.productId,
        variantId: adjustment.variantId,
        type: adjustment.type,
        quantityChange: adjustment.quantityChange,
        note: adjustment.note,
        actorUserId: adjustment.actorUserId,
        createdAt: adjustment.createdAt,
      })),
      meta: { total, page, limit },
    };
  }

  async adjust(
    businessId: string,
    productId: string,
    dto: CreateProductInventoryAdjustmentDto,
    actor: RequestUser,
  ): Promise<ProductInventoryStateResponseDto> {
    const product = await this.productRepository.findById(businessId, productId);
    if (!product) {
      throw new AppException(
        ErrorCode.PRODUCT_NOT_FOUND,
        'Product not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (!product.trackInventory) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Inventory tracking is disabled for this product',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (product.productType === ProductType.VARIABLE && !dto.variantId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'variantId is required for variable products',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (product.productType !== ProductType.VARIABLE && dto.variantId) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'variantId is only valid for variable products',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (dto.variantId) {
      const variant = await this.variantRepository.findById(
        businessId,
        dto.variantId,
      );
      if (!variant || variant.productId !== productId) {
        throw new AppException(
          ErrorCode.PRODUCT_VARIANT_NOT_FOUND,
          'Product variant not found',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    let normalizedChange: number;
    try {
      normalizedChange = normalizeProductInventoryQuantityChange(
        dto.type,
        dto.quantityChange,
      );
    } catch (error) {
      if (error instanceof ProductInventoryQuantityError) {
        if (error.code === 'INVALID_RECOUNT') {
          throw new AppException(
            ErrorCode.VALIDATION_ERROR,
            'Recount quantity must be a non-negative whole number',
            HttpStatus.BAD_REQUEST,
          );
        }
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          'quantityChange must be non-zero',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw error;
    }

    try {
      await this.inventoryRepository.adjustStockInTransaction(businessId, {
        productId,
        variantId: dto.variantId,
        type: dto.type,
        quantityChange: normalizedChange,
        note: dto.note?.trim() || null,
        actorUserId: actor.id,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'INSUFFICIENT_STOCK') {
          throw new AppException(
            ErrorCode.INSUFFICIENT_PRODUCT_STOCK,
            'Insufficient product stock',
            HttpStatus.BAD_REQUEST,
          );
        }
        if (error.message === 'VARIANT_NOT_FOUND') {
          throw new AppException(
            ErrorCode.PRODUCT_VARIANT_NOT_FOUND,
            'Product variant not found',
            HttpStatus.NOT_FOUND,
          );
        }
      }
      throw error;
    }

    if (product.productType === ProductType.VARIABLE) {
      await this.inventoryRepository.syncVariableProductStock(
        businessId,
        productId,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product_inventory.adjusted',
      entityType: 'Product',
      entityId: productId,
    });

    return this.getState(businessId, productId, {
      variantId: dto.variantId,
      page: 1,
      limit: 20,
    });
  }

  async recordCheckoutSales(
    businessId: string,
    checkoutId: string,
    lines: {
      id: string;
      productId: string;
      variantId?: string | null;
      quantity: number;
    }[],
    actorUserId?: string,
  ): Promise<void> {
    for (const line of lines) {
      const prior = await this.inventoryRepository.findSaleForInvoiceItem(
        businessId,
        checkoutId,
        line.id,
      );
      if (prior) continue;

      const product = await this.productRepository.findById(
        businessId,
        line.productId,
      );
      if (!product?.trackInventory) continue;

      const qty = Math.max(1, Math.round(line.quantity));
      await this.inventoryRepository.adjustStockInTransaction(businessId, {
        productId: line.productId,
        variantId: line.variantId ?? null,
        type: ProductInventoryAdjustmentType.SALE,
        quantityChange: -qty,
        note: `Sale checkout`,
        actorUserId: actorUserId ?? null,
        checkoutId,
        invoiceItemId: line.id,
      });

      if (product.productType === ProductType.VARIABLE) {
        await this.inventoryRepository.syncVariableProductStock(
          businessId,
          line.productId,
        );
      }
    }
  }
}
