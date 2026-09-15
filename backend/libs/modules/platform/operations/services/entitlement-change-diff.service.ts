import { Injectable } from '@nestjs/common';
import { CapabilityFeatureStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type {
  EntitlementAddonDiffItem,
  EntitlementCapabilityDiffItem,
  EntitlementNamedRef,
  EntitlementServiceRef,
} from '../utils/entitlement-change-diff.util';

@Injectable()
export class EntitlementChangeDiffService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveServices(
    featureKeys: string[],
  ): Promise<EntitlementServiceRef[]> {
    const unique = [...new Set(featureKeys.filter(Boolean))];
    if (!unique.length) return [];

    const rows = await this.prisma.registryFeature.findMany({
      where: { key: { in: unique }, deletedAt: null },
      select: {
        key: true,
        name: true,
        description: true,
        moduleName: true,
      },
    });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return unique.map((key) => {
      const row = byKey.get(key);
      return {
        key,
        name: row?.name ?? key,
        description: row?.description ?? null,
        moduleName: row?.moduleName ?? null,
      };
    });
  }

  async resolveCapabilities(
    capabilityIds: string[],
  ): Promise<EntitlementCapabilityDiffItem[]> {
    const unique = [...new Set(capabilityIds.filter(Boolean))];
    if (!unique.length) return [];

    const rows = await this.prisma.capability.findMany({
      where: { id: { in: unique }, deletedAt: null },
      select: {
        id: true,
        key: true,
        name: true,
        featureAssignments: {
          where: {
            deletedAt: null,
            status: CapabilityFeatureStatus.ACTIVE,
          },
          select: { featureKey: true },
        },
      },
    });

    const allKeys = rows.flatMap((r) =>
      r.featureAssignments.map((a) => a.featureKey),
    );
    const services = await this.resolveServices(allKeys);
    const serviceByKey = new Map(services.map((s) => [s.key, s]));

    const byId = new Map(rows.map((r) => [r.id, r]));
    const items: EntitlementCapabilityDiffItem[] = [];
    for (const id of unique) {
      const row = byId.get(id);
      if (!row) continue;
      items.push({
        id: row.id,
        key: row.key,
        name: row.name,
        services: row.featureAssignments
          .map((a) => serviceByKey.get(a.featureKey))
          .filter((s): s is EntitlementServiceRef => !!s),
      });
    }
    return items;
  }

  async resolveAddons(addonIds: string[]): Promise<EntitlementAddonDiffItem[]> {
    const unique = [...new Set(addonIds.filter(Boolean))];
    if (!unique.length) return [];

    const rows = await this.prisma.addon.findMany({
      where: { id: { in: unique }, deletedAt: null },
      select: {
        id: true,
        key: true,
        name: true,
        priceMonthly: true,
        capability: {
          select: {
            id: true,
            key: true,
            name: true,
            featureAssignments: {
              where: {
                deletedAt: null,
                status: CapabilityFeatureStatus.ACTIVE,
              },
              select: { featureKey: true },
            },
          },
        },
      },
    });

    const allKeys = rows.flatMap((r) =>
      r.capability.featureAssignments.map((a) => a.featureKey),
    );
    const services = await this.resolveServices(allKeys);
    const serviceByKey = new Map(services.map((s) => [s.key, s]));

    const byId = new Map(rows.map((r) => [r.id, r]));
    const items: EntitlementAddonDiffItem[] = [];
    for (const id of unique) {
      const row = byId.get(id);
      if (!row) continue;
      const capability: EntitlementNamedRef = {
        id: row.capability.id,
        key: row.capability.key,
        name: row.capability.name,
      };
      items.push({
        id: row.id,
        key: row.key,
        name: row.name,
        priceMonthly: row.priceMonthly?.toString() ?? null,
        capability,
        services: row.capability.featureAssignments
          .map((a) => serviceByKey.get(a.featureKey))
          .filter((s): s is EntitlementServiceRef => !!s),
      });
    }
    return items;
  }

  async resolveCapabilityNamed(
    capabilityId: string,
  ): Promise<EntitlementNamedRef | null> {
    const row = await this.prisma.capability.findFirst({
      where: { id: capabilityId, deletedAt: null },
      select: { id: true, key: true, name: true },
    });
    if (!row) return null;
    return { id: row.id, key: row.key, name: row.name };
  }

  async listActiveFeatureKeysForCapability(
    capabilityId: string,
  ): Promise<string[]> {
    const rows = await this.prisma.capabilityFeatureAssignment.findMany({
      where: {
        capabilityId,
        deletedAt: null,
        status: CapabilityFeatureStatus.ACTIVE,
      },
      select: { featureKey: true },
    });
    return rows.map((r) => r.featureKey);
  }
}
