import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CapabilityNavigationResponseDto,
  CreateCapabilityNavigationDto,
  UpdateCapabilityNavigationDto,
} from '../dto';
import { toCapabilityNavigation } from '../mappers/capability.mapper';
import { CapabilityRepository } from '../repositories/capability.repository';
import { CapabilityValidationService } from './capability-validation.service';
import { CapabilitiesService } from './capabilities.service';

@Injectable()
export class CapabilityNavigationService {
  constructor(
    private readonly repository: CapabilityRepository,
    private readonly capabilitiesService: CapabilitiesService,
    private readonly validation: CapabilityValidationService,
    private readonly auditService: AuditService,
  ) {}

  async list(capabilityId: string): Promise<CapabilityNavigationResponseDto[]> {
    await this.capabilitiesService.requireCapability(capabilityId);
    const items = await this.repository.findNavigationItems(capabilityId);
    return items.map(toCapabilityNavigation);
  }

  async create(
    capabilityId: string,
    dto: CreateCapabilityNavigationDto,
    actor: RequestUser,
  ): Promise<CapabilityNavigationResponseDto> {
    await this.capabilitiesService.requireCapability(capabilityId);
    this.validation.validateKey(dto.key, 'navigation key');

    const routeCheck = this.validation.validateRoute(dto.route);
    if (routeCheck.warning) {
      // warn-level for MANUAL nav items — stored in audit metadata
    }

    if (dto.moduleId) {
      await this.requireModule(capabilityId, dto.moduleId);
    }

    const item = await this.repository.createNavigation({
      capability: { connect: { id: capabilityId } },
      ...(dto.moduleId ? { module: { connect: { id: dto.moduleId } } } : {}),
      key: dto.key,
      label: dto.label.trim(),
      route: dto.route,
      icon: dto.icon,
      status: dto.status,
      sortOrder: dto.sortOrder ?? 0,
      requiredFeatureKey: dto.requiredFeatureKey,
      requiredPermissionKey: dto.requiredPermissionKey,
      metadata: dto.metadata as Prisma.InputJsonValue | undefined,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.navigation.created',
      entityType: 'CapabilityNavigationItem',
      entityId: item.id,
      metadata: {
        capabilityId,
        key: item.key,
        routeWarning: routeCheck.warning,
      },
    });

    return toCapabilityNavigation(item);
  }

  async update(
    capabilityId: string,
    navId: string,
    dto: UpdateCapabilityNavigationDto,
    actor: RequestUser,
  ): Promise<CapabilityNavigationResponseDto> {
    await this.requireNavigation(capabilityId, navId);

    if (dto.route) {
      this.validation.validateRoute(dto.route);
    }

    if (dto.moduleId) {
      await this.requireModule(capabilityId, dto.moduleId);
    }

    const updated = await this.repository.updateNavigation(navId, {
      ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
      ...(dto.route !== undefined ? { route: dto.route } : {}),
      ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
      ...(dto.moduleId !== undefined
        ? dto.moduleId
          ? { module: { connect: { id: dto.moduleId } } }
          : { module: { disconnect: true } }
        : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      ...(dto.requiredFeatureKey !== undefined
        ? { requiredFeatureKey: dto.requiredFeatureKey }
        : {}),
      ...(dto.requiredPermissionKey !== undefined
        ? { requiredPermissionKey: dto.requiredPermissionKey }
        : {}),
      ...(dto.metadata !== undefined
        ? { metadata: dto.metadata as Prisma.InputJsonValue }
        : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.navigation.updated',
      entityType: 'CapabilityNavigationItem',
      entityId: navId,
      metadata: { capabilityId, changes: dto },
    });

    return toCapabilityNavigation(updated);
  }

  async remove(
    capabilityId: string,
    navId: string,
    actor: RequestUser,
  ): Promise<void> {
    const item = await this.requireNavigation(capabilityId, navId);
    await this.repository.softDeleteNavigation(navId);

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.navigation.archived',
      entityType: 'CapabilityNavigationItem',
      entityId: navId,
      metadata: { capabilityId, key: item.key },
    });
  }

  private async requireNavigation(capabilityId: string, navId: string) {
    const item = await this.repository.findNavigationById(capabilityId, navId);
    if (!item) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Navigation item not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return item;
  }

  private async requireModule(capabilityId: string, moduleId: string) {
    const module = await this.repository.findModuleById(capabilityId, moduleId);
    if (!module) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Module not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return module;
  }
}
