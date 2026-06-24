import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Prisma,
  ProductStatus,
  ProductType,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CreateProductDto,
  ListProductsQueryDto,
  ProductDetailResponseDto,
  ProductListItemResponseDto,
} from '../dto/product.dto';
import { UpdateProductDto } from '../dto/product.dto';
import {
  toProductDetailResponse,
  toProductListItemResponse,
} from '../mappers/product.mapper';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import { ProductRepository } from '../repositories/product.repository';
import { ProductCategoriesService } from './product-categories.service';
import { ProductVariantRegenerationService } from './product-variant-regeneration.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly categoryRepository: ProductCategoryRepository,
    private readonly categoriesService: ProductCategoriesService,
    private readonly variantRegenerationService: ProductVariantRegenerationService,
    private readonly auditService: AuditService,
  ) {}

  async list(
    businessId: string,
    query: ListProductsQueryDto,
  ): Promise<{
    items: ProductListItemResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { skip, take, page, limit } = getPaginationParams(query);
    const { items, total } = await this.productRepository.findMany(businessId, {
      skip,
      take,
      search: query.search,
      status: query.status,
      categoryId: query.categoryId,
      productType: query.productType,
    });

    return {
      items: items.map(toProductListItemResponse),
      meta: { total, page, limit },
    };
  }

  async getById(
    businessId: string,
    id: string,
  ): Promise<ProductDetailResponseDto> {
    const product = await this.productRepository.findByIdWithDetail(
      businessId,
      id,
    );
    if (!product) {
      throw new AppException(
        ErrorCode.PRODUCT_NOT_FOUND,
        'Product not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toProductDetailResponse(product);
  }

  async create(
    businessId: string,
    dto: CreateProductDto,
    actor: RequestUser,
  ): Promise<ProductDetailResponseDto> {
    const productType = dto.productType ?? ProductType.SIMPLE;
    await this.assertValidProductTypePayload(productType, dto);

    const categoryId =
      dto.categoryId ??
      (await this.categoriesService.getOrCreateDefaultCategory(businessId));
    await this.assertCategory(businessId, categoryId);

    const sortOrder = await this.productRepository.nextSortOrder(
      businessId,
      categoryId,
    );

    const product = await this.productRepository.create(businessId, {
      category: { connect: { id: categoryId } },
      productType,
      name: dto.name.trim(),
      brand: dto.brand?.trim() || null,
      description: dto.description?.trim() || null,
      supplier: dto.supplier?.trim() || null,
      unitPrice:
        dto.unitPrice !== undefined
          ? new Prisma.Decimal(dto.unitPrice)
          : new Prisma.Decimal(0),
      unitLabel: dto.unitLabel?.trim() || null,
      purchaseCost:
        dto.purchaseCost !== undefined
          ? new Prisma.Decimal(dto.purchaseCost)
          : null,
      chargeTax: dto.chargeTax ?? true,
      trackInventory: dto.trackInventory ?? true,
      sku: dto.sku?.trim() || null,
      barcode: dto.barcode?.trim() || null,
      desiredQuantity: dto.desiredQuantity ?? null,
      stockQuantity:
        productType === ProductType.VARIABLE ? 0 : (dto.stockQuantity ?? 0),
      commissionEnabled: dto.commissionEnabled ?? true,
      assignStaffToSale: dto.assignStaffToSale ?? false,
      considerAsSalesRevenue: dto.considerAsSalesRevenue ?? true,
      autoAddToNewSales: dto.autoAddToNewSales ?? false,
      customAttributes: (dto.customAttributes ?? undefined) as
        | Prisma.InputJsonValue
        | undefined,
      status: dto.status ?? ProductStatus.ACTIVE,
      sortOrder,
    });

    if (productType === ProductType.VARIABLE) {
      await this.variantRegenerationService.regenerateVariants(
        businessId,
        product.id,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product.created',
      entityType: 'Product',
      entityId: product.id,
    });

    return this.getById(businessId, product.id);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateProductDto,
    actor: RequestUser,
  ): Promise<ProductDetailResponseDto> {
    const existing = await this.productRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.PRODUCT_NOT_FOUND,
        'Product not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.categoryId) {
      await this.assertCategory(businessId, dto.categoryId);
    }

    const product = await this.productRepository.update(businessId, id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.categoryId !== undefined
        ? dto.categoryId
          ? { category: { connect: { id: dto.categoryId } } }
          : { category: { disconnect: true } }
        : {}),
      ...(dto.brand !== undefined ? { brand: dto.brand?.trim() || null } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() || null }
        : {}),
      ...(dto.supplier !== undefined
        ? { supplier: dto.supplier?.trim() || null }
        : {}),
      ...(dto.unitPrice !== undefined
        ? { unitPrice: new Prisma.Decimal(dto.unitPrice) }
        : {}),
      ...(dto.unitLabel !== undefined
        ? { unitLabel: dto.unitLabel?.trim() || null }
        : {}),
      ...(dto.purchaseCost !== undefined
        ? {
            purchaseCost:
              dto.purchaseCost != null
                ? new Prisma.Decimal(dto.purchaseCost)
                : null,
          }
        : {}),
      ...(dto.chargeTax !== undefined ? { chargeTax: dto.chargeTax } : {}),
      ...(dto.trackInventory !== undefined
        ? { trackInventory: dto.trackInventory }
        : {}),
      ...(dto.sku !== undefined ? { sku: dto.sku?.trim() || null } : {}),
      ...(dto.barcode !== undefined
        ? { barcode: dto.barcode?.trim() || null }
        : {}),
      ...(dto.desiredQuantity !== undefined
        ? { desiredQuantity: dto.desiredQuantity }
        : {}),
      ...(dto.commissionEnabled !== undefined
        ? { commissionEnabled: dto.commissionEnabled }
        : {}),
      ...(dto.assignStaffToSale !== undefined
        ? { assignStaffToSale: dto.assignStaffToSale }
        : {}),
      ...(dto.considerAsSalesRevenue !== undefined
        ? { considerAsSalesRevenue: dto.considerAsSalesRevenue }
        : {}),
      ...(dto.autoAddToNewSales !== undefined
        ? { autoAddToNewSales: dto.autoAddToNewSales }
        : {}),
      ...(dto.customAttributes !== undefined
        ? {
            customAttributes:
              dto.customAttributes == null
                ? Prisma.JsonNull
                : (dto.customAttributes as Prisma.InputJsonValue),
          }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });

    if (!product) {
      throw new AppException(
        ErrorCode.PRODUCT_NOT_FOUND,
        'Product not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product.updated',
      entityType: 'Product',
      entityId: id,
    });

    return this.getById(businessId, id);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<ProductDetailResponseDto> {
    const existing = await this.productRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.PRODUCT_NOT_FOUND,
        'Product not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const product = await this.productRepository.softDelete(businessId, id);
    if (!product) {
      throw new AppException(
        ErrorCode.PRODUCT_NOT_FOUND,
        'Product not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product.deleted',
      entityType: 'Product',
      entityId: id,
    });

    const detail = await this.productRepository.findByIdWithDetail(
      businessId,
      id,
    );
    if (detail) {
      return toProductDetailResponse(detail);
    }

    return {
      ...toProductListItemResponse({
        ...product,
        category: null,
      }),
      description: product.description,
      supplier: product.supplier,
      unitLabel: product.unitLabel,
      purchaseCost: product.purchaseCost?.toString() ?? null,
      chargeTax: product.chargeTax,
      barcode: product.barcode,
      desiredQuantity: product.desiredQuantity,
      commissionEnabled: product.commissionEnabled,
      assignStaffToSale: product.assignStaffToSale,
      considerAsSalesRevenue: product.considerAsSalesRevenue,
      autoAddToNewSales: product.autoAddToNewSales,
      customAttributes:
        (product.customAttributes as Record<string, unknown> | null) ?? null,
      featuredImageKey: product.featuredImageKey,
      featuredImageMimeType: product.featuredImageMimeType,
      featuredImageWidth: product.featuredImageWidth,
      featuredImageHeight: product.featuredImageHeight,
      options: [],
      variants: [],
      images: [],
      bundleItems: [],
      recentAdjustments: [],
    };
  }

  private async assertCategory(
    businessId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await this.categoryRepository.findById(
      businessId,
      categoryId,
    );
    if (!category) {
      throw new AppException(
        ErrorCode.PRODUCT_CATEGORY_NOT_FOUND,
        'Product category not found',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async assertValidProductTypePayload(
    productType: ProductType,
    dto: CreateProductDto,
  ): Promise<void> {
    if (productType === ProductType.BUNDLE && dto.stockQuantity != null) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Bundle products do not track stock at the product level',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      productType === ProductType.VARIABLE &&
      dto.stockQuantity != null &&
      dto.stockQuantity > 0
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Variable product stock is managed per variant',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
