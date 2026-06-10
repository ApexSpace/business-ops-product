import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CapabilityPermissionResponseDto,
  CreateCapabilityPermissionDto,
  UpdateCapabilityPermissionDto,
} from '../dto';
import { toCapabilityPermission } from '../mappers/capability.mapper';
import { CapabilityRepository } from '../repositories/capability.repository';
import { CapabilityValidationService } from './capability-validation.service';
import { CapabilitiesService } from './capabilities.service';

@Injectable()
export class CapabilityPermissionsService {
  constructor(
    private readonly repository: CapabilityRepository,
    private readonly capabilitiesService: CapabilitiesService,
    private readonly validation: CapabilityValidationService,
    private readonly auditService: AuditService,
  ) {}

  async list(capabilityId: string): Promise<CapabilityPermissionResponseDto[]> {
    await this.capabilitiesService.requireCapability(capabilityId);
    const items = await this.repository.findPermissions(capabilityId);
    return items.map(toCapabilityPermission);
  }

  async create(
    capabilityId: string,
    dto: CreateCapabilityPermissionDto,
    actor: RequestUser,
  ): Promise<CapabilityPermissionResponseDto> {
    await this.capabilitiesService.requireCapability(capabilityId);
    this.validation.validateKey(dto.key, 'permission key');

    if (dto.featureId) {
      const feature = await this.repository.findFeatureById(
        capabilityId,
        dto.featureId,
      );
      if (!feature) {
        throw new AppException(
          ErrorCode.NOT_FOUND,
          'Linked feature not found',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    const permission = await this.repository.createPermission({
      capability: { connect: { id: capabilityId } },
      ...(dto.featureId ? { feature: { connect: { id: dto.featureId } } } : {}),
      key: dto.key,
      name: dto.name.trim(),
      description: dto.description?.trim(),
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.permission.created',
      entityType: 'CapabilityPermission',
      entityId: permission.id,
      metadata: { capabilityId, key: permission.key },
    });

    return toCapabilityPermission(permission);
  }

  async update(
    capabilityId: string,
    permissionId: string,
    dto: UpdateCapabilityPermissionDto,
    actor: RequestUser,
  ): Promise<CapabilityPermissionResponseDto> {
    await this.requirePermission(capabilityId, permissionId);

    if (dto.featureId) {
      const feature = await this.repository.findFeatureById(
        capabilityId,
        dto.featureId,
      );
      if (!feature) {
        throw new AppException(
          ErrorCode.NOT_FOUND,
          'Linked feature not found',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    const updated = await this.repository.updatePermission(permissionId, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description?.trim() }
        : {}),
      ...(dto.featureId !== undefined
        ? dto.featureId
          ? { feature: { connect: { id: dto.featureId } } }
          : { feature: { disconnect: true } }
        : {}),
      ...(dto.metadata !== undefined
        ? { metadata: dto.metadata as Prisma.InputJsonValue }
        : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.permission.updated',
      entityType: 'CapabilityPermission',
      entityId: permissionId,
      metadata: { capabilityId, changes: dto },
    });

    return toCapabilityPermission(updated);
  }

  async remove(
    capabilityId: string,
    permissionId: string,
    actor: RequestUser,
  ): Promise<void> {
    const permission = await this.requirePermission(capabilityId, permissionId);
    await this.repository.softDeletePermission(permissionId);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.permission.archived',
      entityType: 'CapabilityPermission',
      entityId: permissionId,
      metadata: { capabilityId, key: permission.key },
    });
  }

  private async requirePermission(capabilityId: string, permissionId: string) {
    const permission = await this.repository.findPermissionById(
      capabilityId,
      permissionId,
    );
    if (!permission) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Permission not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return permission;
  }
}
