import { HttpStatus, Injectable } from '@nestjs/common';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  CreateResourceDto,
  ListResourcesQueryDto,
  ResourceListItemResponseDto,
  ResourcePickerItemResponseDto,
  UpdateResourceDto,
} from '../dto/resource.dto';
import {
  CreateResourceScheduleExceptionDto,
  LinkedServiceResponseDto,
  ReplaceResourceAvailabilityDto,
  ResourceWorkspaceResponseDto,
} from '../dto/resource-workspace.dto';
import {
  toAvailabilityResponse,
  toResourceListItemResponse,
  toResourcePickerItem,
  toScheduleExceptionResponse,
} from '../mappers/resource.mapper';
import { ResourceGroupRepository } from '../repositories/resource-group.repository';
import { ResourceRepository } from '../repositories/resource.repository';

@Injectable()
export class ResourcesService {
  constructor(
    private readonly resourceRepository: ResourceRepository,
    private readonly groupRepository: ResourceGroupRepository,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(
    businessId: string,
    query: ListResourcesQueryDto,
  ): Promise<ResourceListItemResponseDto[]> {
    const items = await this.resourceRepository.findMany(businessId, query);
    return items.map(toResourceListItemResponse);
  }

  async picker(
    businessId: string,
    search?: string,
  ): Promise<ResourcePickerItemResponseDto[]> {
    const items = await this.resourceRepository.findMany(businessId, {
      search,
    });
    return items
      .filter((item) => item.status === 'ACTIVE')
      .map(toResourcePickerItem);
  }

  async getById(
    businessId: string,
    id: string,
  ): Promise<ResourceListItemResponseDto> {
    const resource = await this.assertResource(businessId, id);
    return toResourceListItemResponse(resource);
  }

  async create(
    businessId: string,
    dto: CreateResourceDto,
    actor: RequestUser,
  ): Promise<ResourceListItemResponseDto> {
    if (dto.groupId) {
      await this.assertGroup(businessId, dto.groupId);
    }

    const sortOrder = await this.resourceRepository.nextSortOrder(
      businessId,
      dto.groupId,
    );
    const resource = await this.resourceRepository.createWithDefaultAvailability(
      businessId,
      {
        name: dto.name.trim(),
        resourceType: dto.resourceType,
        groupId: dto.groupId ?? null,
        description: dto.description?.trim() || null,
        sortOrder,
      },
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'resource.created',
      entityType: 'Resource',
      entityId: resource.id,
    });

    return toResourceListItemResponse(resource);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateResourceDto,
    actor: RequestUser,
  ): Promise<ResourceListItemResponseDto> {
    await this.assertResource(businessId, id);

    if (dto.groupId) {
      await this.assertGroup(businessId, dto.groupId);
    }

    const resource = await this.resourceRepository.update(businessId, id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.resourceType !== undefined
        ? { resourceType: dto.resourceType }
        : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() || null }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.groupId !== undefined
        ? dto.groupId
          ? { group: { connect: { id: dto.groupId } } }
          : { group: { disconnect: true } }
        : {}),
    });

    if (!resource) {
      throw new AppException(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Resource not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'resource.updated',
      entityType: 'Resource',
      entityId: id,
    });

    return toResourceListItemResponse(resource);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<ResourceListItemResponseDto> {
    const existing = await this.assertResource(businessId, id);
    const requirementCount =
      await this.resourceRepository.countServiceRequirements(businessId, id);
    if (requirementCount > 0) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Cannot delete a resource linked to services. Unlink service requirements first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.resourceRepository.softDelete(businessId, id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'resource.deleted',
      entityType: 'Resource',
      entityId: id,
    });

    return toResourceListItemResponse(existing);
  }

  async getWorkspace(
    businessId: string,
    resourceId: string,
  ): Promise<ResourceWorkspaceResponseDto> {
    const resource = await this.assertResource(businessId, resourceId);
    const [availability, scheduleExceptions, linkedServices] = await Promise.all([
      this.resourceRepository.listAvailability(businessId, resourceId),
      this.resourceRepository.listScheduleExceptions(businessId, resourceId),
      this.listLinkedServices(businessId, resourceId),
    ]);

    return {
      resource: toResourceListItemResponse(resource),
      availability: availability.map(toAvailabilityResponse),
      scheduleExceptions: scheduleExceptions.map(toScheduleExceptionResponse),
      linkedServices,
    };
  }

  async replaceAvailability(
    businessId: string,
    resourceId: string,
    dto: ReplaceResourceAvailabilityDto,
    actor: RequestUser,
  ) {
    await this.assertResource(businessId, resourceId);
    const rows = await this.resourceRepository.replaceAvailability(
      businessId,
      resourceId,
      dto.slots.map((slot) => ({
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isEnabled: slot.isEnabled ?? true,
      })),
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'resource.availability_updated',
      entityType: 'Resource',
      entityId: resourceId,
    });

    return rows.map(toAvailabilityResponse);
  }

  async createScheduleException(
    businessId: string,
    resourceId: string,
    dto: CreateResourceScheduleExceptionDto,
    actor: RequestUser,
  ) {
    await this.assertResource(businessId, resourceId);
    const row = await this.resourceRepository.createScheduleException(
      businessId,
      resourceId,
      {
        date: new Date(dto.date),
        startTime: dto.startTime ?? null,
        endTime: dto.endTime ?? null,
        isUnavailable: dto.isUnavailable,
        reason: dto.reason?.trim() || null,
      },
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'resource.schedule_exception_created',
      entityType: 'Resource',
      entityId: resourceId,
    });

    return toScheduleExceptionResponse(row);
  }

  async deleteScheduleException(
    businessId: string,
    resourceId: string,
    exceptionId: string,
    actor: RequestUser,
  ): Promise<void> {
    await this.assertResource(businessId, resourceId);
    const deleted = await this.resourceRepository.deleteScheduleException(
      businessId,
      resourceId,
      exceptionId,
    );
    if (!deleted) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Schedule exception not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'resource.schedule_exception_deleted',
      entityType: 'Resource',
      entityId: resourceId,
    });
  }

  async assertResourceExists(
    businessId: string,
    resourceId: string,
    expectedType?: string,
  ) {
    const resource = await this.assertResource(businessId, resourceId);
    if (expectedType && resource.resourceType !== expectedType) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        `Resource type must be ${expectedType}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return resource;
  }

  private async assertResource(businessId: string, id: string) {
    const resource = await this.resourceRepository.findById(businessId, id);
    if (!resource) {
      throw new AppException(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Resource not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return resource;
  }

  private async assertGroup(businessId: string, groupId: string) {
    const group = await this.groupRepository.findById(businessId, groupId);
    if (!group) {
      throw new AppException(
        ErrorCode.RESOURCE_GROUP_NOT_FOUND,
        'Resource group not found',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async listLinkedServices(
    businessId: string,
    resourceId: string,
  ): Promise<LinkedServiceResponseDto[]> {
    const [serviceRequirements, optionRequirements] = await Promise.all([
      this.prisma.serviceResourceRequirement.findMany({
        where: { businessId, resourceId },
        include: { service: { select: { id: true, name: true } } },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.serviceOptionResourceRequirement.findMany({
        where: { businessId, resourceId },
        include: {
          serviceOption: {
            include: {
              group: {
                include: { service: { select: { id: true, name: true } } },
              },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    const fromServices: LinkedServiceResponseDto[] = serviceRequirements.map(
      (row) => ({
        serviceId: row.service.id,
        serviceName: row.service.name,
        requirementId: row.id,
        label: row.label,
        quantity: row.quantity,
        source: 'service' as const,
        optionName: null,
      }),
    );

    const fromOptions: LinkedServiceResponseDto[] = optionRequirements.map(
      (row) => ({
        serviceId: row.serviceOption.group.service.id,
        serviceName: row.serviceOption.group.service.name,
        requirementId: row.id,
        label: row.serviceOption.name,
        quantity: row.quantity,
        source: 'service_option' as const,
        optionName: row.serviceOption.name,
      }),
    );

    return [...fromServices, ...fromOptions];
  }
}
