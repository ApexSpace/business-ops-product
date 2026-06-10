import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CapabilityFeatureSource,
  CapabilityFeatureStatus,
  Prisma,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  AssignedCapabilityFeatureDto,
  BulkAssignResultDto,
  CreateManualRegistryFeatureDto,
  RegistryAvailableFeatureDto,
  UpdateCapabilityFeatureAssignmentDto,
} from '../dto';
import {
  toAssignedCapabilityFeature,
  toRegistryAvailableFeature,
} from '../mappers/capability.mapper';
import { getRegistryFeature } from '../registries/capability-feature.registry';
import { CapabilityRepository } from '../repositories/capability.repository';
import { CapabilityValidationService } from './capability-validation.service';
import { CapabilitiesService } from './capabilities.service';

@Injectable()
export class CapabilityFeaturesService {
  constructor(
    private readonly repository: CapabilityRepository,
    private readonly capabilitiesService: CapabilitiesService,
    private readonly validation: CapabilityValidationService,
    private readonly auditService: AuditService,
  ) {}

  async listAssigned(
    capabilityId: string,
  ): Promise<AssignedCapabilityFeatureDto[]> {
    await this.capabilitiesService.requireCapability(capabilityId);
    const assignments =
      await this.repository.findFeatureAssignments(capabilityId);
    return assignments.map(toAssignedCapabilityFeature);
  }

  async getAvailableFeatures(
    capabilityId: string,
  ): Promise<RegistryAvailableFeatureDto[]> {
    await this.capabilitiesService.requireCapability(capabilityId);
    const [registry, assignments] = await Promise.all([
      this.repository.findAllRegistryFeatures(),
      this.repository.findFeatureAssignments(capabilityId),
    ]);
    const assignedByKey = new Map(assignments.map((a) => [a.featureKey, a]));
    return registry.map((feature) =>
      toRegistryAvailableFeature(feature, assignedByKey.get(feature.key)),
    );
  }

  async assignFeatures(
    capabilityId: string,
    featureKeys: string[],
    actor: RequestUser,
  ): Promise<BulkAssignResultDto> {
    await this.capabilitiesService.requireCapability(capabilityId);
    const assigned: string[] = [];
    const skipped: string[] = [];

    for (const featureKey of featureKeys) {
      const registryFeature =
        await this.repository.findRegistryFeatureByKey(featureKey);
      if (!registryFeature) {
        skipped.push(featureKey);
        continue;
      }

      const existing = await this.repository.findFeatureAssignment(
        capabilityId,
        featureKey,
      );
      if (existing) {
        skipped.push(featureKey);
        continue;
      }

      await this.repository.assignFeatures(capabilityId, [featureKey]);
      assigned.push(featureKey);
    }

    if (assigned.length > 0) {
      await this.auditService.log({
        actorUserId: actor.id,
        action: 'platform.capability.features.assigned',
        entityType: 'Capability',
        entityId: capabilityId,
        metadata: { featureKeys: assigned },
      });
    }

    return { assigned, skipped };
  }

  async unassignFeature(
    capabilityId: string,
    featureKey: string,
    actor: RequestUser,
  ): Promise<void> {
    await this.capabilitiesService.requireCapability(capabilityId);
    const assignment = await this.repository.findFeatureAssignment(
      capabilityId,
      featureKey,
    );
    if (!assignment) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Feature assignment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.repository.unassignFeature(capabilityId, featureKey);
    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.features.unassigned',
      entityType: 'Capability',
      entityId: capabilityId,
      metadata: { featureKey },
    });
  }

  async updateAssignment(
    capabilityId: string,
    featureKey: string,
    dto: UpdateCapabilityFeatureAssignmentDto,
    actor: RequestUser,
  ): Promise<AssignedCapabilityFeatureDto> {
    const assignment = await this.repository.findFeatureAssignment(
      capabilityId,
      featureKey,
    );
    if (!assignment) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Feature assignment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const updated = await this.repository.updateFeatureAssignment(
      assignment.id,
      {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.metadata !== undefined
          ? { metadata: dto.metadata as Prisma.InputJsonValue }
          : {}),
      },
    );

    const withRegistry = await this.repository.findFeatureAssignment(
      capabilityId,
      featureKey,
    );
    if (!withRegistry) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Assignment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.feature_assignment.updated',
      entityType: 'CapabilityFeatureAssignment',
      entityId: updated.id,
      metadata: { capabilityId, featureKey, changes: dto },
    });

    return toAssignedCapabilityFeature(withRegistry);
  }

  /** Advanced: create a MANUAL registry feature and optionally assign to capability. */
  async createManualRegistryFeature(
    capabilityId: string,
    dto: CreateManualRegistryFeatureDto,
    actor: RequestUser,
  ): Promise<AssignedCapabilityFeatureDto>;
  async createManualRegistryFeature(
    capabilityId: string,
    dto: CreateManualRegistryFeatureDto,
    actor: RequestUser,
    assign: true,
  ): Promise<AssignedCapabilityFeatureDto>;
  async createManualRegistryFeature(
    capabilityId: string,
    dto: CreateManualRegistryFeatureDto,
    actor: RequestUser,
    assign: false,
  ): Promise<RegistryAvailableFeatureDto>;
  async createManualRegistryFeature(
    capabilityId: string,
    dto: CreateManualRegistryFeatureDto,
    actor: RequestUser,
    assign = true,
  ): Promise<AssignedCapabilityFeatureDto | RegistryAvailableFeatureDto> {
    await this.capabilitiesService.requireCapability(capabilityId);
    this.validation.validateKey(dto.key, 'feature key');

    const existing = await this.repository.findRegistryFeatureByKey(dto.key);
    if (existing) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Feature key already exists in registry',
        HttpStatus.CONFLICT,
      );
    }

    const codeDef = getRegistryFeature(dto.key);
    if (codeDef) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Feature key is reserved by code registry',
        HttpStatus.CONFLICT,
      );
    }

    const feature = await this.repository.createManualRegistryFeature({
      key: dto.key,
      moduleKey: dto.moduleKey,
      moduleName: dto.moduleName,
      name: dto.name.trim(),
      description: dto.description?.trim(),
      permissionKey: dto.permissionKey,
      defaultEnabled: dto.defaultEnabled ?? false,
      isBillable: dto.isBillable ?? false,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.registry_feature.created_manual',
      entityType: 'RegistryFeature',
      entityId: feature.id,
      metadata: { key: feature.key, capabilityId },
    });

    if (!assign) {
      return toRegistryAvailableFeature(feature);
    }

    await this.repository.assignFeatures(capabilityId, [dto.key]);
    const assignment = await this.repository.findFeatureAssignment(
      capabilityId,
      dto.key,
    );
    if (!assignment) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Assignment failed',
        HttpStatus.NOT_FOUND,
      );
    }
    return toAssignedCapabilityFeature(assignment);
  }
}
