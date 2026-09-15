import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, ServiceStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { CreateServiceDto } from '../dto/create-service.dto';
import { ListServicesQueryDto } from '../dto/list-services-query.dto';
import { ReorderServicesDto } from '../dto/reorder-services.dto';
import { ServiceResponseDto } from '../dto/service-response.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';
import { toServiceResponse } from '../mappers/service.mapper';
import { ServiceRepository } from '../repositories/service.repository';
import { ServiceWorkspaceRepository } from '../repositories/service-workspace.repository';
import { ServiceCategoriesService } from './service-categories.service';
import { normalizeServiceDetailsPatch } from '../utils/service-details.util';

@Injectable()
export class ServicesService {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly workspaceRepository: ServiceWorkspaceRepository,
    private readonly categoriesService: ServiceCategoriesService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    businessId: string,
    dto: CreateServiceDto,
    actor: RequestUser,
  ): Promise<ServiceResponseDto> {
    const categoryId =
      dto.categoryId ??
      (await this.categoriesService.getOrCreateDefaultCategory(businessId));

    const category = await this.categoriesService.list(businessId);
    if (!category.some((c) => c.id === categoryId)) {
      throw new AppException(
        ErrorCode.SERVICE_CATEGORY_NOT_FOUND,
        'Service category not found',
        HttpStatus.BAD_REQUEST,
      );
    }

    const sortOrder = await this.workspaceRepository.nextServiceSortOrder(
      businessId,
      categoryId,
    );

    const base = {
      durationMinutes: dto.durationMinutes ?? 60,
      hasProcessingTime: dto.hasProcessingTime ?? false,
      processingDurationMinutes: dto.processingDurationMinutes ?? 0,
      finishDurationMinutes: dto.finishDurationMinutes ?? null,
      hasBufferTime: dto.hasBufferTime ?? false,
      bufferBeforeMinutes: dto.bufferBeforeMinutes ?? 0,
      bufferAfterMinutes: dto.bufferAfterMinutes ?? 0,
      usesProducts: dto.usesProducts ?? false,
      requiresNoStaff: dto.requiresNoStaff ?? false,
      requiresTwoStaff: dto.requiresTwoStaff ?? false,
      hasCommissionDeduction: dto.hasCommissionDeduction ?? false,
      commissionDeductionType: dto.commissionDeductionType ?? null,
      commissionDeductionValue:
        dto.commissionDeductionValue !== undefined
          ? new Prisma.Decimal(dto.commissionDeductionValue)
          : null,
      postCommissionDeductionType: dto.postCommissionDeductionType ?? null,
      postCommissionDeductionValue:
        dto.postCommissionDeductionValue !== undefined
          ? new Prisma.Decimal(dto.postCommissionDeductionValue)
          : null,
    };

    let normalized: Prisma.ServiceUpdateInput;
    try {
      normalized = normalizeServiceDetailsPatch(
        {
          ...base,
          commissionDeductionType: base.commissionDeductionType,
          commissionDeductionValue: base.commissionDeductionValue,
          postCommissionDeductionType: base.postCommissionDeductionType,
          postCommissionDeductionValue: base.postCommissionDeductionValue,
        },
        {},
      );
    } catch {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'requiresNoStaff and requiresTwoStaff cannot both be enabled',
        HttpStatus.BAD_REQUEST,
      );
    }

    const service = await this.serviceRepository.create(businessId, {
      category: { connect: { id: categoryId } },
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : null,
      status: dto.status ?? ServiceStatus.ACTIVE,
      sortOrder,
      isDemo: dto.isDemo ?? false,
      durationMinutes: (normalized.durationMinutes as number) ?? 60,
      hasProcessingTime: (normalized.hasProcessingTime as boolean) ?? false,
      processingDurationMinutes:
        (normalized.processingDurationMinutes as number) ?? 0,
      finishDurationMinutes:
        (normalized.finishDurationMinutes as number | null) ?? null,
      hasBufferTime: (normalized.hasBufferTime as boolean) ?? false,
      bufferBeforeMinutes: (normalized.bufferBeforeMinutes as number) ?? 0,
      bufferAfterMinutes: (normalized.bufferAfterMinutes as number) ?? 0,
      usesProducts: (normalized.usesProducts as boolean) ?? false,
      requiresNoStaff: (normalized.requiresNoStaff as boolean) ?? false,
      requiresTwoStaff: (normalized.requiresTwoStaff as boolean) ?? false,
      hasCommissionDeduction:
        (normalized.hasCommissionDeduction as boolean) ?? false,
      commissionDeductionType:
        (normalized.commissionDeductionType as typeof dto.commissionDeductionType) ??
        null,
      commissionDeductionValue:
        (normalized.commissionDeductionValue as Prisma.Decimal | null) ?? null,
      postCommissionDeductionType:
        (normalized.postCommissionDeductionType as typeof dto.postCommissionDeductionType) ??
        null,
      postCommissionDeductionValue:
        (normalized.postCommissionDeductionValue as Prisma.Decimal | null) ??
        null,
    });

    await this.workspaceRepository.createOnlineBookingSettings(
      businessId,
      service.id,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.created',
      entityType: 'Service',
      entityId: service.id,
    });

    const withCategory = await this.serviceRepository.findByIdWithCategory(
      businessId,
      service.id,
    );
    return toServiceResponse(withCategory!);
  }

  async list(
    businessId: string,
    query: ListServicesQueryDto,
  ): Promise<{
    items: ServiceResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.serviceRepository.findMany(businessId, {
      skip,
      take,
      search: query.search?.trim() || undefined,
      status: query.status,
      categoryId: query.categoryId,
    });

    return {
      items: items.map(toServiceResponse),
      meta: { total, page, limit },
    };
  }

  async getById(businessId: string, id: string): Promise<ServiceResponseDto> {
    const service = await this.serviceRepository.findByIdWithCategory(
      businessId,
      id,
    );
    if (!service) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'Service not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toServiceResponse(service);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateServiceDto,
    actor: RequestUser,
  ): Promise<ServiceResponseDto> {
    const existing = await this.serviceRepository.findByIdWithCategory(
      businessId,
      id,
    );
    if (!existing) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'Service not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const data: Prisma.ServiceUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.categoryId !== undefined) {
      data.category = { connect: { id: dto.categoryId } };
    }
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.price !== undefined) {
      data.price = dto.price === null ? null : new Prisma.Decimal(dto.price);
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.isDemo !== undefined) {
      data.isDemo = dto.isDemo;
    }
    if (
      dto.durationMinutes !== undefined ||
      dto.hasProcessingTime !== undefined ||
      dto.hasBufferTime !== undefined ||
      dto.usesProducts !== undefined ||
      dto.requiresNoStaff !== undefined ||
      dto.requiresTwoStaff !== undefined ||
      dto.hasCommissionDeduction !== undefined ||
      dto.commissionDeductionType !== undefined ||
      dto.commissionDeductionValue !== undefined ||
      dto.postCommissionDeductionType !== undefined ||
      dto.postCommissionDeductionValue !== undefined
    ) {
      try {
        Object.assign(
          data,
          normalizeServiceDetailsPatch(existing, {
            durationMinutes: dto.durationMinutes,
            hasProcessingTime: dto.hasProcessingTime,
            hasBufferTime: dto.hasBufferTime,
            usesProducts: dto.usesProducts,
            requiresNoStaff: dto.requiresNoStaff,
            requiresTwoStaff: dto.requiresTwoStaff,
            hasCommissionDeduction: dto.hasCommissionDeduction,
            commissionDeductionType: dto.commissionDeductionType,
            commissionDeductionValue: dto.commissionDeductionValue,
            postCommissionDeductionType: dto.postCommissionDeductionType,
            postCommissionDeductionValue: dto.postCommissionDeductionValue,
          }),
        );
      } catch {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          'requiresNoStaff and requiresTwoStaff cannot both be enabled',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const service = await this.serviceRepository.update(businessId, id, data);
    if (!service) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'Service not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.updated',
      entityType: 'Service',
      entityId: id,
      metadata: { ...dto },
    });

    return toServiceResponse(service);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<ServiceResponseDto> {
    const existing = await this.serviceRepository.findByIdWithCategory(
      businessId,
      id,
    );
    if (!existing) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'Service not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.serviceRepository.softDelete(businessId, id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.deleted',
      entityType: 'Service',
      entityId: id,
    });

    return toServiceResponse(existing);
  }

  async reorder(
    businessId: string,
    dto: ReorderServicesDto,
    actor: RequestUser,
  ): Promise<ServiceResponseDto[]> {
    const categories = await this.categoriesService.list(businessId);
    if (!categories.some((c) => c.id === dto.categoryId)) {
      throw new AppException(
        ErrorCode.SERVICE_CATEGORY_NOT_FOUND,
        'Service category not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const existing = await this.serviceRepository.findManyOrderedByCategory(
      businessId,
      dto.categoryId,
    );
    const existingIds = new Set(existing.map((s) => s.id));
    if (
      dto.orderedIds.length !== existing.length ||
      dto.orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'orderedIds must include every service in the category exactly once',
        HttpStatus.BAD_REQUEST,
      );
    }

    const items = await this.serviceRepository.reorderInCategory(
      businessId,
      dto.categoryId,
      dto.orderedIds,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.reordered',
      entityType: 'Service',
      entityId: dto.categoryId,
      metadata: { categoryId: dto.categoryId, orderedIds: dto.orderedIds },
    });

    return items.map(toServiceResponse);
  }
}
