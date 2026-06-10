import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, ServiceStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { CreateServiceDto } from '../dto/create-service.dto';
import { ListServicesQueryDto } from '../dto/list-services-query.dto';
import { ServiceResponseDto } from '../dto/service-response.dto';
import { UpdateServiceDto } from '../dto/update-service.dto';
import { toServiceResponse } from '../mappers/service.mapper';
import { ServiceRepository } from '../repositories/service.repository';

@Injectable()
export class ServicesService {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(
    businessId: string,
    dto: CreateServiceDto,
    actor: RequestUser,
  ): Promise<ServiceResponseDto> {
    const service = await this.serviceRepository.create(businessId, {
      name: dto.name.trim(),
      category: dto.category?.trim() || null,
      description: dto.description?.trim() || null,
      price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : null,
      status: dto.status,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'service.created',
      entityType: 'Service',
      entityId: service.id,
    });

    return toServiceResponse(service);
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
    });

    return {
      items: items.map(toServiceResponse),
      meta: { total, page, limit },
    };
  }

  async getById(businessId: string, id: string): Promise<ServiceResponseDto> {
    const service = await this.serviceRepository.findById(businessId, id);
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
    const existing = await this.serviceRepository.findById(businessId, id);
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
    if (dto.category !== undefined) {
      data.category = dto.category?.trim() || null;
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
    const existing = await this.serviceRepository.findById(businessId, id);
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
}
