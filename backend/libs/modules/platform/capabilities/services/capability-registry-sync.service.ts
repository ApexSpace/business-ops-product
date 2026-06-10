import { Injectable } from '@nestjs/common';
import { CapabilityFeatureSource } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { CapabilityRegistryDiffDto, RegistryModuleCatalogDto } from '../dto';
import {
  getAllRegistryFeatureKeys,
  getRegistryFeatures,
} from '../registries/capability-feature.registry';
import { getRegistryModules } from '../registries/capability-module.registry';
import type { CapabilityRegistrySyncReport } from '../types/capability-registry.types';
import { CapabilityRepository } from '../repositories/capability.repository';

@Injectable()
export class CapabilityRegistrySyncService {
  constructor(
    private readonly repository: CapabilityRepository,
    private readonly auditService: AuditService,
  ) {}

  listRegistryModules(): RegistryModuleCatalogDto[] {
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

  async getRegistryDiff(): Promise<CapabilityRegistryDiffDto> {
    return this.buildDiff(true);
  }

  async sync(
    options: { dryRun?: boolean },
    actor: RequestUser,
  ): Promise<CapabilityRegistryDiffDto> {
    const dryRun = options.dryRun ?? false;
    const report = await this.buildDiff(dryRun);

    if (!dryRun) {
      await this.auditService.log({
        actorUserId: actor.id,
        action: 'platform.capability.registry.synced',
        entityType: 'RegistryFeature',
        entityId: 'global',
        metadata: {
          synced: report.synced.length,
          missingInCode: report.missingInCode.length,
          drifted: report.drifted.length,
        },
      });
    }

    return report;
  }

  private async buildDiff(dryRun: boolean): Promise<CapabilityRegistryDiffDto> {
    const report = emptyReport(dryRun);
    const codeFeatures = getRegistryFeatures();
    const dbFeatures = await this.repository.findAllRegistryFeatures();
    const dbByKey = new Map(dbFeatures.map((f) => [f.key, f]));

    for (const def of codeFeatures) {
      report.availableInCode.push({
        key: def.featureKey,
        name: def.featureName,
        message: 'feature',
      });

      const db = dbByKey.get(def.featureKey);
      if (!db) {
        report.missingInDb.push({
          key: def.featureKey,
          name: def.featureName,
          message: 'feature',
        });
        if (!dryRun) {
          await this.repository.upsertCodeRegistryFeature(
            def.featureKey,
            {
              moduleKey: def.moduleKey,
              moduleName: def.moduleName,
              name: def.featureName,
              description: def.description,
              permissionKey: def.permissionKey,
              routeKeys: def.routeKeys,
              icon: def.icon,
              defaultEnabled: def.defaultEnabled,
              isBillable: def.isBillable,
              limitKey: def.limitKey,
            },
            null,
          );
          report.synced.push({
            key: def.featureKey,
            name: def.featureName,
            message: 'feature',
          });
        }
        continue;
      }

      if (db.source === CapabilityFeatureSource.MANUAL) {
        report.warnings.push(
          `Skipped MANUAL registry feature ${def.featureKey}`,
        );
        continue;
      }

      const driftFields: Array<{
        field: string;
        registryValue: unknown;
        dbValue: unknown;
      }> = [];
      if (db.name !== def.featureName) {
        driftFields.push({
          field: 'name',
          registryValue: def.featureName,
          dbValue: db.name,
        });
      }
      if (db.moduleKey !== def.moduleKey) {
        driftFields.push({
          field: 'moduleKey',
          registryValue: def.moduleKey,
          dbValue: db.moduleKey,
        });
      }
      if (db.moduleName !== def.moduleName) {
        driftFields.push({
          field: 'moduleName',
          registryValue: def.moduleName,
          dbValue: db.moduleName,
        });
      }

      if (driftFields.length > 0) {
        for (const drift of driftFields) {
          report.drifted.push({
            key: def.featureKey,
            name: def.featureName,
            field: drift.field,
            registryValue: drift.registryValue,
            dbValue: drift.dbValue,
            message: 'feature',
          });
        }
      } else {
        report.synced.push({
          key: def.featureKey,
          name: def.featureName,
          message: 'feature',
        });
      }

      if (!dryRun) {
        await this.repository.upsertCodeRegistryFeature(
          def.featureKey,
          {
            moduleKey: def.moduleKey,
            moduleName: def.moduleName,
            name: def.featureName,
            description: def.description,
            permissionKey: def.permissionKey,
            routeKeys: def.routeKeys,
            icon: def.icon,
            defaultEnabled: def.defaultEnabled,
            isBillable: def.isBillable,
            limitKey: def.limitKey,
          },
          db,
        );
      }
    }

    const codeKeys = getAllRegistryFeatureKeys();
    for (const db of dbFeatures) {
      if (db.source === CapabilityFeatureSource.CODE && !codeKeys.has(db.key)) {
        report.missingInCode.push({
          key: db.key,
          name: db.name,
          message: 'feature',
        });
      }
    }

    return report;
  }
}

function emptyReport(dryRun: boolean): CapabilityRegistrySyncReport {
  return {
    dryRun,
    availableInCode: [],
    synced: [],
    missingInDb: [],
    missingInCode: [],
    drifted: [],
    warnings: [],
  };
}

export async function seedCapabilityRegistryFromCode(
  prismaClient: import('@prisma/client').PrismaClient,
): Promise<CapabilityRegistryDiffDto> {
  const repository = new CapabilityRepository(prismaClient as never);
  const syncService = new CapabilityRegistrySyncService(repository, {
    log: async () => undefined,
  } as never);
  return syncService.sync({ dryRun: false }, {
    id: 'seed',
    email: 'seed@system.local',
  } as RequestUser);
}
