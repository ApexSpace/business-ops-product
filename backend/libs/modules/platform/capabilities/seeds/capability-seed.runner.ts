import { PrismaClient } from '@prisma/client';
import { REGISTRY_FEATURES } from '../registries/capability-feature.registry';

/**
 * Optional: upserts global registry_features from code.
 * Module catalog and assignments work without this — features are also upserted on module assign.
 */
export async function seedCapabilitiesFromRegistry(
  prisma: PrismaClient,
): Promise<void> {
  for (const def of REGISTRY_FEATURES) {
    const existing = await prisma.registryFeature.findFirst({
      where: { key: def.featureKey, deletedAt: null },
    });

    if (existing?.source === 'MANUAL') {
      continue;
    }

    if (existing) {
      await prisma.registryFeature.update({
        where: { id: existing.id },
        data: {
          moduleKey: def.moduleKey,
          moduleName: def.moduleName,
          name: def.featureName,
          description: def.description,
          permissionKey: def.permissionKey,
          routeKeys: def.routeKeys?.length ? def.routeKeys : undefined,
          icon: def.icon,
          deletedAt: null,
        },
      });
    } else {
      await prisma.registryFeature.create({
        data: {
          key: def.featureKey,
          moduleKey: def.moduleKey,
          moduleName: def.moduleName,
          name: def.featureName,
          description: def.description,
          permissionKey: def.permissionKey,
          routeKeys: def.routeKeys?.length ? def.routeKeys : undefined,
          icon: def.icon,
          source: 'CODE',
          defaultEnabled: def.defaultEnabled ?? false,
          isBillable: def.isBillable ?? false,
          limitKey: def.limitKey,
          status: def.status ?? 'ACTIVE',
        },
      });
    }
  }
}
