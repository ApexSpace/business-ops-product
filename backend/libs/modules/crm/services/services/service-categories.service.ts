import { HttpStatus, Injectable } from '@nestjs/common';
import { ServiceStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CreateServiceCategoryDto,
  ReorderServiceCategoriesDto,
  ServiceCategoryResponseDto,
  UpdateServiceCategoryDto,
} from '../dto/service-category.dto';
import { toServiceCategoryResponse } from '../mappers/service-category.mapper';
import { ServiceCategoryRepository } from '../repositories/service-category.repository';

@Injectable()
export class ServiceCategoriesService {
  constructor(
    private readonly categoryRepository: ServiceCategoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(businessId: string): Promise<ServiceCategoryResponseDto[]> {
    const items = await this.categoryRepository.findManyOrdered(businessId);
    return items.map(toServiceCategoryResponse);
  }

  async create(
    businessId: string,
    dto: CreateServiceCategoryDto,
    actor: RequestUser,
  ): Promise<ServiceCategoryResponseDto> {
    const sortOrder = await this.categoryRepository.nextSortOrder(businessId);
    const category = await this.categoryRepository.create(businessId, {
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      sortOrder,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service_category.created',
      entityType: 'ServiceCategory',
      entityId: category.id,
    });

    return toServiceCategoryResponse(category);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateServiceCategoryDto,
    actor: RequestUser,
  ): Promise<ServiceCategoryResponseDto> {
    const existing = await this.categoryRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.SERVICE_CATEGORY_NOT_FOUND,
        'Service category not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const category = await this.categoryRepository.update(businessId, id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() || null }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });

    if (!category) {
      throw new AppException(
        ErrorCode.SERVICE_CATEGORY_NOT_FOUND,
        'Service category not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service_category.updated',
      entityType: 'ServiceCategory',
      entityId: id,
    });

    return toServiceCategoryResponse(category);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<ServiceCategoryResponseDto> {
    const existing = await this.categoryRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.SERVICE_CATEGORY_NOT_FOUND,
        'Service category not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const serviceCount = await this.categoryRepository.countActiveServices(
      businessId,
      id,
    );
    if (serviceCount > 0) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Cannot delete a category that still has services. Move or delete services first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const category = await this.categoryRepository.softDelete(businessId, id);
    if (!category) {
      throw new AppException(
        ErrorCode.SERVICE_CATEGORY_NOT_FOUND,
        'Service category not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service_category.deleted',
      entityType: 'ServiceCategory',
      entityId: id,
    });

    return toServiceCategoryResponse(category);
  }

  async reorder(
    businessId: string,
    dto: ReorderServiceCategoriesDto,
    actor: RequestUser,
  ): Promise<ServiceCategoryResponseDto[]> {
    const existing = await this.categoryRepository.findManyOrdered(businessId);
    const existingIds = new Set(existing.map((c) => c.id));
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
      action: 'service_category.reordered',
      entityType: 'ServiceCategory',
      entityId: businessId,
    });

    return items.map(toServiceCategoryResponse);
  }

  async getOrCreateDefaultCategory(businessId: string): Promise<string> {
    const categories =
      await this.categoryRepository.findManyOrdered(businessId);
    const general = categories.find((c) => c.name === 'General');
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
