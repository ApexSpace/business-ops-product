import { Injectable } from '@nestjs/common';
import {
  BusinessCapabilityAssignmentStatus,
  CapabilityFeatureStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { getRegistryFeature } from '@app/modules/platform/capabilities/registries/capability-feature.registry';
import {
  flattenRegistryFeatures,
  getAllRegistryModuleKeys,
  getFeatureKeysForModule,
} from '@app/modules/platform/capabilities/registries/capability-module.registry';
import type { RegistryFeatureDefinition } from '@app/modules/platform/capabilities/types/capability-registry.types';
import { EffectiveCapability } from '../types/business-access-resolution.types';
import { BusinessCapabilityRepository } from '../repositories/business-capability.repository';

@Injectable()
export class BusinessEffectiveCapabilitiesService {
  private readonly registryModuleKeys = getAllRegistryModuleKeys();

  constructor(
    private readonly prisma: PrismaService,
    private readonly businessCapabilityRepository: BusinessCapabilityRepository,
  ) {}

  async resolveFeatureKeys(businessId: string): Promise<Set<string>> {
    const capabilities = await this.resolveEffectiveCapabilities(businessId);
    return new Set(capabilities.map((cap) => cap.key));
  }

  async resolveEffectiveCapabilities(
    businessId: string,
  ): Promise<EffectiveCapability[]> {
    const rows =
      await this.businessCapabilityRepository.findByBusinessId(businessId);
    const activeRows = rows.filter(
      (row) => row.status === BusinessCapabilityAssignmentStatus.ACTIVE,
    );

    if (activeRows.length === 0) {
      return [];
    }

    const capabilityIds = activeRows.map((row) => row.capabilityId);
    const bundles = await this.prisma.capability.findMany({
      where: { id: { in: capabilityIds }, deletedAt: null },
      include: {
        featureAssignments: {
          where: { deletedAt: null, status: CapabilityFeatureStatus.ACTIVE },
          include: {
            feature: {
              select: { key: true, name: true, description: true },
            },
          },
        },
        moduleAssignments: {
          where: { deletedAt: null },
          select: { moduleKey: true },
        },
      },
    });

    const bundleById = new Map(bundles.map((bundle) => [bundle.id, bundle]));
    const featureKeys = new Set<string>();

    for (const row of activeRows) {
      const bundle = bundleById.get(row.capabilityId);
      if (!bundle) {
        this.addLegacyCapabilityKey(featureKeys, row.capability.key);
        continue;
      }

      for (const assignment of bundle.featureAssignments) {
        featureKeys.add(assignment.featureKey);
      }

      for (const assignment of bundle.moduleAssignments) {
        for (const key of getFeatureKeysForModule(assignment.moduleKey)) {
          featureKeys.add(key);
        }
      }

      if (
        bundle.featureAssignments.length === 0 &&
        bundle.moduleAssignments.length === 0
      ) {
        this.addLegacyCapabilityKey(featureKeys, bundle.key);
      }
    }

    return Array.from(featureKeys)
      .sort()
      .map((key) => this.toEffectiveCapability(key));
  }

  private addLegacyCapabilityKey(keys: Set<string>, capabilityKey: string): void {
    if (this.registryModuleKeys.has(capabilityKey)) {
      for (const key of getFeatureKeysForModule(capabilityKey)) {
        keys.add(key);
      }
      return;
    }

    if (getRegistryFeature(capabilityKey)) {
      keys.add(capabilityKey);
      return;
    }

    const prefix = `${capabilityKey}.`;
    const registryFeatures = flattenRegistryFeatures();
    const matched = registryFeatures.filter(
      (feature: RegistryFeatureDefinition) =>
        feature.featureKey === capabilityKey ||
        feature.featureKey.startsWith(prefix),
    );
    if (matched.length > 0) {
      for (const feature of matched) {
        keys.add(feature.featureKey);
      }
      return;
    }

    keys.add(capabilityKey);
  }

  private toEffectiveCapability(featureKey: string): EffectiveCapability {
    const registry = getRegistryFeature(featureKey);
    if (registry) {
      return {
        key: featureKey,
        name: registry.featureName,
      };
    }

    const [moduleKey, ...rest] = featureKey.split('.');
    const label =
      rest.length > 0
        ? `${moduleKey} ${rest.join(' ')}`.replace(/_/g, ' ')
        : featureKey;

    return {
      key: featureKey,
      name: label,
    };
  }
}
