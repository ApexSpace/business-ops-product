import { HttpStatus, Injectable } from '@nestjs/common';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  AssignedCapabilityModuleDto,
  BulkModuleAssignResultDto,
  CapabilityModuleSyncItemDto,
  RegistryModuleCatalogDto,
} from '../dto';
import {
  deriveOptionsFromFeatureKeys,
  getFeatureKeysForEnabledOptions,
  getFeatureKeysForModule,
  getModuleOptions,
  getRegistryModule,
  getRegistryModules,
} from '../registries/capability-module.registry';
import { CapabilityRepository } from '../repositories/capability.repository';
import { CapabilitiesService } from './capabilities.service';

@Injectable()
export class CapabilityModulesService {
  constructor(
    private readonly repository: CapabilityRepository,
    private readonly capabilitiesService: CapabilitiesService,
    private readonly auditService: AuditService,
  ) {}

  listCatalog(): RegistryModuleCatalogDto[] {
    return getRegistryModules().map((mod) => ({
      moduleKey: mod.moduleKey,
      name: mod.name,
      description: mod.description,
      icon: mod.icon ?? null,
      featureCount: mod.options.length,
      availableOptions: mod.options.map((opt) => ({
        key: opt.key,
        name: opt.name,
        description: opt.description,
        group: opt.group ?? null,
      })),
    }));
  }

  async listAssigned(
    capabilityId: string,
  ): Promise<AssignedCapabilityModuleDto[]> {
    await this.capabilitiesService.requireCapability(capabilityId);
    const [assignments, assignedFeatureKeys] = await Promise.all([
      this.repository.findModuleAssignments(capabilityId),
      this.repository.findAssignedFeatureKeys(capabilityId),
    ]);
    const featureKeySet = new Set(assignedFeatureKeys);

    return assignments.map((assignment) => {
      const mod = getRegistryModule(assignment.moduleKey);
      const options = deriveOptionsFromFeatureKeys(
        assignment.moduleKey,
        featureKeySet,
      );
      const enabled = Object.values(options).some(Boolean);

      return {
        moduleKey: assignment.moduleKey,
        name: mod?.name ?? assignment.moduleKey,
        description: mod?.description ?? null,
        icon: mod?.icon ?? null,
        createdAt: assignment.createdAt,
        options,
        enabled,
      };
    });
  }

  async assignModules(
    capabilityId: string,
    moduleKeys: string[],
    actor: RequestUser,
  ): Promise<BulkModuleAssignResultDto> {
    await this.capabilitiesService.requireCapability(capabilityId);
    const assigned: string[] = [];
    const skipped: string[] = [];
    const featureKeysToAssign: string[] = [];

    for (const moduleKey of moduleKeys) {
      if (!getRegistryModule(moduleKey)) {
        skipped.push(moduleKey);
        continue;
      }

      const existing = await this.repository.findModuleAssignment(
        capabilityId,
        moduleKey,
      );
      if (existing) {
        skipped.push(moduleKey);
        continue;
      }

      assigned.push(moduleKey);
      featureKeysToAssign.push(...getFeatureKeysForModule(moduleKey));
    }

    if (assigned.length === 0) {
      return { assigned, skipped };
    }

    await this.repository.assignModules(capabilityId, assigned);
    if (featureKeysToAssign.length > 0) {
      await this.repository.ensureCodeRegistryFeatures(featureKeysToAssign);
      await this.repository.assignFeatures(capabilityId, featureKeysToAssign);
    }

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.modules.assigned',
      entityType: 'Capability',
      entityId: capabilityId,
      metadata: { moduleKeys: assigned },
    });

    return { assigned, skipped };
  }

  async unassignModule(
    capabilityId: string,
    moduleKey: string,
    actor: RequestUser,
    options?: { skipAudit?: boolean },
  ): Promise<void> {
    await this.capabilitiesService.requireCapability(capabilityId);
    const assignment = await this.repository.findModuleAssignment(
      capabilityId,
      moduleKey,
    );
    if (!assignment) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Module assignment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const featureKeys = getFeatureKeysForModule(moduleKey);
    await this.repository.unassignModule(capabilityId, moduleKey);
    await this.repository.unassignFeaturesByKeys(capabilityId, featureKeys);

    if (!options?.skipAudit) {
      await this.auditService.log({
        actorUserId: actor.id,
        action: 'platform.capability.modules.unassigned',
        entityType: 'Capability',
        entityId: capabilityId,
        metadata: { moduleKey },
      });
    }
  }

  /** Sync module selection — replaces assignments and feature keys per module options. */
  async syncModules(
    capabilityId: string,
    modules: CapabilityModuleSyncItemDto[],
    actor: RequestUser,
  ): Promise<{ assigned: string[]; unassigned: string[] }> {
    await this.capabilitiesService.requireCapability(capabilityId);

    const targetModuleKeys = new Set<string>();
    const targetFeatureKeys = new Set<string>();

    for (const item of modules) {
      if (!getRegistryModule(item.moduleKey)) continue;
      const featureKeys = getFeatureKeysForEnabledOptions(
        item.moduleKey,
        item.options,
      );
      if (featureKeys.length === 0) continue;
      targetModuleKeys.add(item.moduleKey);
      for (const key of featureKeys) {
        targetFeatureKeys.add(key);
      }
    }

    const [currentModules, currentFeatureKeys] = await Promise.all([
      this.repository.findModuleAssignments(capabilityId),
      this.repository.findAssignedFeatureKeys(capabilityId),
    ]);
    const currentModuleKeys = new Set(currentModules.map((a) => a.moduleKey));
    const currentFeatureKeySet = new Set(currentFeatureKeys);

    const modulesToUnassign = [...currentModuleKeys].filter(
      (key) => !targetModuleKeys.has(key),
    );
    const modulesToAssign = [...targetModuleKeys].filter(
      (key) => !currentModuleKeys.has(key),
    );

    const registryScopedKeys = new Set<string>();
    for (const moduleKey of new Set([
      ...currentModuleKeys,
      ...targetModuleKeys,
    ])) {
      getFeatureKeysForModule(moduleKey).forEach((key) =>
        registryScopedKeys.add(key),
      );
    }

    const featuresToUnassign = currentFeatureKeys.filter(
      (key) => registryScopedKeys.has(key) && !targetFeatureKeys.has(key),
    );
    const featuresToAssign = [...targetFeatureKeys].filter(
      (key) => !currentFeatureKeySet.has(key),
    );

    for (const moduleKey of modulesToUnassign) {
      await this.unassignModule(capabilityId, moduleKey, actor, {
        skipAudit: true,
      });
    }

    if (featuresToUnassign.length > 0) {
      await this.repository.unassignFeaturesByKeys(
        capabilityId,
        featuresToUnassign,
      );
    }

    if (featuresToAssign.length > 0) {
      await this.repository.ensureCodeRegistryFeatures(featuresToAssign);
      await this.repository.assignFeatures(capabilityId, featuresToAssign);
    }

    if (modulesToAssign.length > 0) {
      await this.repository.assignModules(capabilityId, modulesToAssign);
    }

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.capability.modules.synced',
      entityType: 'Capability',
      entityId: capabilityId,
      metadata: {
        moduleKeys: [...targetModuleKeys],
        featureKeys: [...targetFeatureKeys],
      },
    });

    return { assigned: modulesToAssign, unassigned: modulesToUnassign };
  }

  /** @deprecated Use syncModules with structured options payload. */
  async syncModulesByKeys(
    capabilityId: string,
    moduleKeys: string[],
    actor: RequestUser,
  ): Promise<{ assigned: string[]; unassigned: string[] }> {
    const modules: CapabilityModuleSyncItemDto[] = moduleKeys
      .filter((moduleKey) => !!getRegistryModule(moduleKey))
      .map((moduleKey) => {
        const options: Record<string, boolean> = {};
        for (const opt of getModuleOptions(moduleKey)) {
          options[opt.key] = true;
        }
        return { moduleKey, options };
      });

    return this.syncModules(capabilityId, modules, actor);
  }
}
