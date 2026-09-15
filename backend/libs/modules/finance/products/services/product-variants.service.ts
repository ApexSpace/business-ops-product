import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, ProductType } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  ProductVariantResponseDto,
  UpdateProductVariantDto,
} from '../dto/product-variant.dto';
import { toProductVariantResponse } from '../mappers/product-variant.mapper';
import { ProductInventoryRepository } from '../repositories/product-inventory.repository';
import { ProductRepository } from '../repositories/product.repository';
import { ProductVariantRepository } from '../repositories/product-variant.repository';

@Injectable()
export class ProductVariantsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly variantRepository: ProductVariantRepository,
    private readonly inventoryRepository: ProductInventoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(
    businessId: string,
    productId: string,
  ): Promise<ProductVariantResponseDto[]> {
    await this.assertVariableProduct(businessId, productId);
    const variants = await this.variantRepository.findManyByProduct(
      businessId,
      productId,
    );
    return variants.map(toProductVariantResponse);
  }

  async getById(
    businessId: string,
    productId: string,
    variantId: string,
  ): Promise<ProductVariantResponseDto> {
    const variant = await this.variantRepository.findById(
      businessId,
      variantId,
    );
    if (!variant || variant.productId !== productId) {
      throw new AppException(
        ErrorCode.PRODUCT_VARIANT_NOT_FOUND,
        'Product variant not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toProductVariantResponse(variant);
  }

  async update(
    businessId: string,
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
    actor: RequestUser,
  ): Promise<ProductVariantResponseDto> {
    await this.assertVariableProduct(businessId, productId);
    const variant = await this.variantRepository.update(businessId, variantId, {
      ...(dto.sku !== undefined ? { sku: dto.sku?.trim() || null } : {}),
      ...(dto.barcode !== undefined
        ? { barcode: dto.barcode?.trim() || null }
        : {}),
      ...(dto.price !== undefined
        ? {
            price: dto.price != null ? new Prisma.Decimal(dto.price) : null,
          }
        : {}),
      ...(dto.compareAtPrice !== undefined
        ? {
            compareAtPrice:
              dto.compareAtPrice != null
                ? new Prisma.Decimal(dto.compareAtPrice)
                : null,
          }
        : {}),
      ...(dto.purchaseCost !== undefined
        ? {
            purchaseCost:
              dto.purchaseCost != null
                ? new Prisma.Decimal(dto.purchaseCost)
                : null,
          }
        : {}),
      ...(dto.desiredQuantity !== undefined
        ? { desiredQuantity: dto.desiredQuantity }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.customAttributes !== undefined
        ? {
            customAttributes:
              dto.customAttributes == null
                ? Prisma.JsonNull
                : (dto.customAttributes as Prisma.InputJsonValue),
          }
        : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
    });

    if (!variant || variant.productId !== productId) {
      throw new AppException(
        ErrorCode.PRODUCT_VARIANT_NOT_FOUND,
        'Product variant not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.inventoryRepository.syncVariableProductStock(
      businessId,
      productId,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product_variant.updated',
      entityType: 'ProductVariant',
      entityId: variantId,
    });

    return this.getById(businessId, productId, variantId);
  }

  private async assertVariableProduct(
    businessId: string,
    productId: string,
  ): Promise<void> {
    const product = await this.productRepository.findById(
      businessId,
      productId,
    );
    if (!product) {
      throw new AppException(
        ErrorCode.PRODUCT_NOT_FOUND,
        'Product not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (product.productType !== ProductType.VARIABLE) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Variants are only supported on variable products',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
