import { HttpStatus, Injectable } from '@nestjs/common';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CreateResourceGroupDto,
  ReorderResourceGroupsDto,
  ResourceGroupResponseDto,
  UpdateResourceGroupDto,
} from '../dto/resource-group.dto';
import { toResourceGroupResponse } from '../mappers/resource.mapper';
import { ResourceGroupRepository } from '../repositories/resource-group.repository';

@Injectable()
export class ResourceGroupsService {
  constructor(
    private readonly groupRepository: ResourceGroupRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(businessId: string): Promise<ResourceGroupResponseDto[]> {
    const groups = await this.groupRepository.findManyOrdered(businessId);
    return Promise.all(
      groups.map(async (group) => {
        const resourceCount = await this.groupRepository.countResources(
          businessId,
          group.id,
        );
        return toResourceGroupResponse(group, resourceCount);
      }),
    );
  }

  async create(
    businessId: string,
    dto: CreateResourceGroupDto,
    actor: RequestUser,
  ): Promise<ResourceGroupResponseDto> {
    const sortOrder = await this.groupRepository.nextSortOrder(businessId);
    const group = await this.groupRepository.create(businessId, {
      name: dto.name.trim(),
      sortOrder,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'resource_group.created',
      entityType: 'ResourceGroup',
      entityId: group.id,
    });

    return toResourceGroupResponse(group, 0);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateResourceGroupDto,
    actor: RequestUser,
  ): Promise<ResourceGroupResponseDto> {
    const group = await this.groupRepository.update(businessId, id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
    });
    if (!group) {
      throw new AppException(
        ErrorCode.RESOURCE_GROUP_NOT_FOUND,
        'Resource group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'resource_group.updated',
      entityType: 'ResourceGroup',
      entityId: id,
    });

    const resourceCount = await this.groupRepository.countResources(
      businessId,
      id,
    );
    return toResourceGroupResponse(group, resourceCount);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<ResourceGroupResponseDto> {
    const existing = await this.groupRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.RESOURCE_GROUP_NOT_FOUND,
        'Resource group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const resourceCount = await this.groupRepository.countResources(
      businessId,
      id,
    );
    if (resourceCount > 0) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Cannot delete a group that still has resources. Move or delete resources first.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const group = await this.groupRepository.softDelete(businessId, id);
    if (!group) {
      throw new AppException(
        ErrorCode.RESOURCE_GROUP_NOT_FOUND,
        'Resource group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'resource_group.deleted',
      entityType: 'ResourceGroup',
      entityId: id,
    });

    return toResourceGroupResponse(group, 0);
  }

  async reorder(
    businessId: string,
    dto: ReorderResourceGroupsDto,
    actor: RequestUser,
  ): Promise<ResourceGroupResponseDto[]> {
    const existing = await this.groupRepository.findManyOrdered(businessId);
    const existingIds = new Set(existing.map((group) => group.id));
    if (
      dto.orderedIds.length !== existing.length ||
      dto.orderedIds.some((id) => !existingIds.has(id))
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'orderedIds must include every group exactly once',
        HttpStatus.BAD_REQUEST,
      );
    }

    const groups = await this.groupRepository.reorder(
      businessId,
      dto.orderedIds,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'resource_group.reordered',
      entityType: 'ResourceGroup',
      entityId: businessId,
    });

    return Promise.all(
      groups.map(async (group) => {
        const resourceCount = await this.groupRepository.countResources(
          businessId,
          group.id,
        );
        return toResourceGroupResponse(group, resourceCount);
      }),
    );
  }
}
