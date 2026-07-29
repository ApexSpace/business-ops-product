import { HttpStatus, Injectable } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CreateProductCategoryDto,
  ProductCategoryResponseDto,
  ReorderProductCategoriesDto,
  UpdateProductCategoryDto,
} from '../dto/product-category.dto';
import { toProductCategoryResponse } from '../mappers/product-category.mapper';
import { ProductCategoryRepository } from '../repositories/product-category.repository';

@Injectable()
export class ProductCategoriesService {
  constructor(
    private readonly categoryRepository: ProductCategoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(businessId: string): Promise<ProductCategoryResponseDto[]> {
    const items = await this.categoryRepository.findManyOrdered(businessId);
    return items.map(toProductCategoryResponse);
  }

  async create(
    businessId: string,
    dto: CreateProductCategoryDto,
    actor: RequestUser,
  ): Promise<ProductCategoryResponseDto> {
    const sortOrder = await this.categoryRepository.nextSortOrder(businessId);
    const category = await this.categoryRepository.create(businessId, {
      name: dto.name.trim(),
      isNonRetail: dto.isNonRetail,
      sortOrder,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product_category.created',
      entityType: 'ProductCategory',
      entityId: category.id,
    });

    return toProductCategoryResponse(category);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateProductCategoryDto,
    actor: RequestUser,
  ): Promise<ProductCategoryResponseDto> {
    const existing = await this.categoryRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.PRODUCT_CATEGORY_NOT_FOUND,
        'Product category not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const category = await this.categoryRepository.update(businessId, id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.isNonRetail !== undefined
        ? { isNonRetail: dto.isNonRetail }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });

    if (!category) {
      throw new AppException(
        ErrorCode.PRODUCT_CATEGORY_NOT_FOUND,
        'Product category not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product_category.updated',
      entityType: 'ProductCategory',
      entityId: id,
    });

    return toProductCategoryResponse(category);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<ProductCategoryResponseDto> {
    const existing = await this.categoryRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.PRODUCT_CATEGORY_NOT_FOUND,
        'Product category not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const productCount = await this.categoryRepository.countActiveProducts(
      businessId,
      id,
    );
    if (productCount > 0) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Cannot delete a category that still has products. Move or delete products first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const category = await this.categoryRepository.softDelete(businessId, id);
    if (!category) {
      throw new AppException(
        ErrorCode.PRODUCT_CATEGORY_NOT_FOUND,
        'Product category not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product_category.deleted',
      entityType: 'ProductCategory',
      entityId: id,
    });

    return toProductCategoryResponse(category);
  }

  async reorder(
    businessId: string,
    dto: ReorderProductCategoriesDto,
    actor: RequestUser,
  ): Promise<ProductCategoryResponseDto[]> {
    const existing = await this.categoryRepository.findManyOrdered(businessId);
    const existingIds = new Set(existing.map((category) => category.id));
    if (
      dto.orderedIds.length !== existing.length ||
      dto.orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'orderedIds must include every category exactly once',
        HttpStatus.BAD_REQUEST,
      );
    }

    const items = await this.categoryRepository.reorder(
      businessId,
      dto.orderedIds,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'product_category.reordered',
      entityType: 'ProductCategory',
      entityId: businessId,
    });

    return items.map(toProductCategoryResponse);
  }

  async getOrCreateDefaultCategory(businessId: string): Promise<string> {
    const categories =
      await this.categoryRepository.findManyOrdered(businessId);
    const general = categories.find((category) => category.name === 'General');
    if (general) {
      return general.id;
    }
    if (categories[0]) {
      return categories[0].id;
    }
    const created = await this.categoryRepository.create(businessId, {
      name: 'General',
      sortOrder: 0,
    });
    return created.id;
  }
}
