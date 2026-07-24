import { Injectable, Logger } from '@nestjs/common';
import {
  CapabilityFeatureSource,
  CapabilityFeatureStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  getRegistryFeature,
  normalizeFeatureKey,
} from '../registries/capability-feature.registry';
import { getRegistryModules } from '../registries/capability-module.registry';
import {
  getFeatureKeyRenamePairs,
  moduleKeyFromFeatureKey,
} from '../utils/feature-key-normalize.util';

export type FeatureKeyMigrationReport = {
  dryRun: boolean;
  registryFeaturesUpserted: number;
  assignmentsRewritten: number;
  assignmentsSkippedConflict: number;
  grantsRewritten: number;
  moduleAssignmentsAdded: number;
};

/**
 * One-shot migration for v3 catalog renames:
 * - ensures code registry features exist
 * - rewrites CapabilityFeatureAssignment + BusinessFeatureGrant keys
 * - ensures module assignments exist for modules implied by feature keys
 */
@Injectable()
export class CapabilityFeatureKeyMigrationService {
  private readonly logger = new Logger(
    CapabilityFeatureKeyMigrationService.name,
  );

  constructor(private readonly prisma: PrismaService) {}

  async migrate(options?: {
    dryRun?: boolean;
  }): Promise<FeatureKeyMigrationReport> {
    const dryRun = options?.dryRun ?? false;
    const report: FeatureKeyMigrationReport = {
      dryRun,
      registryFeaturesUpserted: 0,
      assignmentsRewritten: 0,
      assignmentsSkippedConflict: 0,
      grantsRewritten: 0,
      moduleAssignmentsAdded: 0,
    };

    const renamePairs = getFeatureKeyRenamePairs();
    const renameMap = new Map(renamePairs.map((p) => [p.from, p.to]));

    if (!dryRun) {
      report.registryFeaturesUpserted = await this.upsertAllCodeFeatures();
    } else {
      report.registryFeaturesUpserted = getRegistryModules().reduce(
        (sum, mod) => sum + mod.options.length,
        0,
      );
    }

    const assignments = await this.prisma.capabilityFeatureAssignment.findMany({
      where: { deletedAt: null },
      select: { id: true, capabilityId: true, featureKey: true },
    });

    for (const row of assignments) {
      const nextKey = renameMap.get(row.featureKey);
      if (!nextKey || nextKey === row.featureKey) continue;

      const conflict = await this.prisma.capabilityFeatureAssignment.findFirst({
        where: {
          capabilityId: row.capabilityId,
          featureKey: nextKey,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (conflict) {
        report.assignmentsSkippedConflict += 1;
        if (!dryRun) {
          await this.prisma.capabilityFeatureAssignment.update({
            where: { id: row.id },
            data: { deletedAt: new Date(), status: CapabilityFeatureStatus.INACTIVE },
          });
        }
        continue;
      }

      report.assignmentsRewritten += 1;
      if (!dryRun) {
        // Soft-delete old, create new (FK to RegistryFeature.key)
        await this.prisma.$transaction(async (tx) => {
          await tx.capabilityFeatureAssignment.update({
            where: { id: row.id },
            data: {
              deletedAt: new Date(),
              status: CapabilityFeatureStatus.INACTIVE,
            },
          });
          await tx.capabilityFeatureAssignment.create({
            data: {
              capabilityId: row.capabilityId,
              featureKey: nextKey,
              status: CapabilityFeatureStatus.ACTIVE,
            },
          });
        });
      }
    }

    const grants = await this.prisma.businessFeatureGrant.findMany({
      select: { id: true, businessId: true, featureKey: true, source: true },
    });

    for (const grant of grants) {
      const nextKey = normalizeFeatureKey(grant.featureKey);
      if (nextKey === grant.featureKey) continue;

      const conflict = await this.prisma.businessFeatureGrant.findFirst({
        where: {
          businessId: grant.businessId,
          featureKey: nextKey,
          source: grant.source,
        },
        select: { id: true },
      });

      if (conflict) {
        continue;
      }

      report.grantsRewritten += 1;
      if (!dryRun) {
        await this.prisma.businessFeatureGrant.update({
          where: { id: grant.id },
          data: { featureKey: nextKey },
        });
      }
    }

    // Ensure module assignments for modules implied by active feature keys
    const activeAssignments =
      await this.prisma.capabilityFeatureAssignment.findMany({
        where: { deletedAt: null, status: CapabilityFeatureStatus.ACTIVE },
        select: { capabilityId: true, featureKey: true },
      });

    const byCapability = new Map<string, Set<string>>();
    for (const row of activeAssignments) {
      const moduleKey = moduleKeyFromFeatureKey(row.featureKey);
      const set = byCapability.get(row.capabilityId) ?? new Set<string>();
      set.add(moduleKey);
      byCapability.set(row.capabilityId, set);
    }

    for (const [capabilityId, moduleKeys] of byCapability) {
      for (const moduleKey of moduleKeys) {
        const existing = await this.prisma.capabilityModuleAssignment.findFirst(
          {
            where: { capabilityId, moduleKey, deletedAt: null },
            select: { id: true },
          },
        );
        if (existing) continue;
        report.moduleAssignmentsAdded += 1;
        if (!dryRun) {
          await this.prisma.capabilityModuleAssignment.create({
            data: { capabilityId, moduleKey },
          });
        }
      }
    }

    this.logger.log(
      `Feature key migration ${dryRun ? '(dry-run) ' : ''}complete: ${JSON.stringify(report)}`,
    );
    return report;
  }

  private async upsertAllCodeFeatures(): Promise<number> {
    let count = 0;
    for (const mod of getRegistryModules()) {
      for (const opt of mod.options) {
        const def = getRegistryFeature(opt.key);
        if (!def) continue;
        await this.prisma.registryFeature.upsert({
          where: { key: opt.key },
          create: {
            key: opt.key,
            moduleKey: mod.moduleKey,
            moduleName: mod.name,
            name: opt.name,
            description: opt.description,
            permissionKey: opt.permissionKey,
            routeKeys: opt.routeKeys ?? undefined,
            icon: opt.icon,
            defaultEnabled: opt.defaultEnabled ?? false,
            isBillable: opt.isBillable ?? false,
            source: CapabilityFeatureSource.CODE,
            status: CapabilityFeatureStatus.ACTIVE,
          },
          update: {
            moduleKey: mod.moduleKey,
            moduleName: mod.name,
            name: opt.name,
            description: opt.description,
            permissionKey: opt.permissionKey,
            routeKeys: opt.routeKeys ?? undefined,
            icon: opt.icon,
            defaultEnabled: opt.defaultEnabled ?? false,
            isBillable: opt.isBillable ?? false,
            source: CapabilityFeatureSource.CODE,
            status: CapabilityFeatureStatus.ACTIVE,
            deletedAt: null,
          },
        });
        count += 1;
      }
    }
    return count;
  }
}
