import { Injectable } from '@nestjs/common';
import {
  Capability,
  CapabilityConfigSchema,
  CapabilityFeature,
  CapabilityFeatureAssignment,
  CapabilityFeatureSource,
  CapabilityFeatureStatus,
  CapabilityLimit,
  CapabilityModule,
  CapabilityNavigationItem,
  CapabilityPermission,
  CapabilityStatus,
  Prisma,
  RegistryFeature,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { getRegistryFeature } from '../registries/capability-feature.registry';

const capabilityCounts = {
  _count: {
    select: {
      moduleAssignments: { where: { deletedAt: null } },
      featureAssignments: { where: { deletedAt: null } },
      permissions: { where: { deletedAt: null } },
      limits: { where: { deletedAt: null } },
      navigationItems: { where: { deletedAt: null } },
      configSchemas: { where: { deletedAt: null } },
    },
  },
} as const;

@Injectable()
export class CapabilityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    skip: number,
    take: number,
    filters?: { status?: CapabilityStatus; search?: string },
  ) {
    const where: Prisma.CapabilityWhereInput = {
      deletedAt: null,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { key: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return Promise.all([
      this.prisma.capability.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
        include: capabilityCounts,
      }),
      this.prisma.capability.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  getStats() {
    const base = { deletedAt: null };
    return Promise.all([
      this.prisma.capability.count({ where: base }),
      this.prisma.capability.count({
        where: { ...base, status: CapabilityStatus.ACTIVE },
      }),
      this.prisma.capability.count({
        where: { ...base, status: CapabilityStatus.DRAFT },
      }),
      this.prisma.capability.count({
        where: {
          ...base,
          status: {
            in: [CapabilityStatus.INACTIVE, CapabilityStatus.DEPRECATED],
          },
        },
      }),
    ]).then(([total, active, draft, inactiveDeprecated]) => ({
      total,
      active,
      draft,
      inactiveDeprecated,
    }));
  }

  findById(id: string) {
    return this.prisma.capability.findFirst({
      where: { id, deletedAt: null },
      include: capabilityCounts,
    });
  }

  findByKey(key: string) {
    return this.prisma.capability.findFirst({
      where: { key, deletedAt: null },
    });
  }

  findByIdIncludingArchived(id: string) {
    return this.prisma.capability.findUnique({ where: { id } });
  }

  create(data: Prisma.CapabilityCreateInput) {
    return this.prisma.capability.create({ data });
  }

  update(id: string, data: Prisma.CapabilityUpdateInput) {
    return this.prisma.capability.update({ where: { id }, data });
  }

  hardDelete(id: string) {
    return this.prisma.capability.delete({ where: { id } });
  }

  findModules(capabilityId: string) {
    return this.prisma.capabilityModule.findMany({
      where: { capabilityId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findModuleById(capabilityId: string, id: string) {
    return this.prisma.capabilityModule.findFirst({
      where: { id, capabilityId, deletedAt: null },
    });
  }

  createModule(data: Prisma.CapabilityModuleCreateInput) {
    return this.prisma.capabilityModule.create({ data });
  }

  updateModule(id: string, data: Prisma.CapabilityModuleUpdateInput) {
    return this.prisma.capabilityModule.update({ where: { id }, data });
  }

  softDeleteModule(id: string) {
    return this.prisma.capabilityModule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  findFeatures(capabilityId: string) {
    return this.prisma.capabilityFeature.findMany({
      where: { capabilityId, deletedAt: null },
      orderBy: [{ key: 'asc' }],
    });
  }

  findFeatureById(capabilityId: string, id: string) {
    return this.prisma.capabilityFeature.findFirst({
      where: { id, capabilityId, deletedAt: null },
    });
  }

  findFeatureByKey(key: string) {
    return this.prisma.capabilityFeature.findFirst({
      where: { key, deletedAt: null },
    });
  }

  createFeature(data: Prisma.CapabilityFeatureCreateInput) {
    return this.prisma.capabilityFeature.create({ data });
  }

  updateFeature(id: string, data: Prisma.CapabilityFeatureUpdateInput) {
    return this.prisma.capabilityFeature.update({ where: { id }, data });
  }

  softDeleteFeature(id: string) {
    return this.prisma.capabilityFeature.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  findPermissions(capabilityId: string) {
    return this.prisma.capabilityPermission.findMany({
      where: { capabilityId, deletedAt: null },
      orderBy: [{ key: 'asc' }],
    });
  }

  findPermissionById(capabilityId: string, id: string) {
    return this.prisma.capabilityPermission.findFirst({
      where: { id, capabilityId, deletedAt: null },
    });
  }

  createPermission(data: Prisma.CapabilityPermissionCreateInput) {
    return this.prisma.capabilityPermission.create({ data });
  }

  updatePermission(id: string, data: Prisma.CapabilityPermissionUpdateInput) {
    return this.prisma.capabilityPermission.update({ where: { id }, data });
  }

  softDeletePermission(id: string) {
    return this.prisma.capabilityPermission.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  findLimits(capabilityId: string) {
    return this.prisma.capabilityLimit.findMany({
      where: { capabilityId, deletedAt: null },
      orderBy: [{ key: 'asc' }],
    });
  }

  findLimitById(capabilityId: string, id: string) {
    return this.prisma.capabilityLimit.findFirst({
      where: { id, capabilityId, deletedAt: null },
    });
  }

  createLimit(data: Prisma.CapabilityLimitCreateInput) {
    return this.prisma.capabilityLimit.create({ data });
  }

  updateLimit(id: string, data: Prisma.CapabilityLimitUpdateInput) {
    return this.prisma.capabilityLimit.update({ where: { id }, data });
  }

  softDeleteLimit(id: string) {
    return this.prisma.capabilityLimit.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  findNavigationItems(capabilityId: string) {
    return this.prisma.capabilityNavigationItem.findMany({
      where: { capabilityId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  findNavigationById(capabilityId: string, id: string) {
    return this.prisma.capabilityNavigationItem.findFirst({
      where: { id, capabilityId, deletedAt: null },
    });
  }

  createNavigation(data: Prisma.CapabilityNavigationItemCreateInput) {
    return this.prisma.capabilityNavigationItem.create({ data });
  }

  updateNavigation(
    id: string,
    data: Prisma.CapabilityNavigationItemUpdateInput,
  ) {
    return this.prisma.capabilityNavigationItem.update({ where: { id }, data });
  }

  softDeleteNavigation(id: string) {
    return this.prisma.capabilityNavigationItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  findConfigSchemas(capabilityId: string) {
    return this.prisma.capabilityConfigSchema.findMany({
      where: { capabilityId, deletedAt: null },
      orderBy: [{ schemaKey: 'asc' }],
    });
  }

  findConfigSchemaById(capabilityId: string, id: string) {
    return this.prisma.capabilityConfigSchema.findFirst({
      where: { id, capabilityId, deletedAt: null },
    });
  }

  createConfigSchema(data: Prisma.CapabilityConfigSchemaCreateInput) {
    return this.prisma.capabilityConfigSchema.create({ data });
  }

  updateConfigSchema(
    id: string,
    data: Prisma.CapabilityConfigSchemaUpdateInput,
  ) {
    return this.prisma.capabilityConfigSchema.update({ where: { id }, data });
  }

  softDeleteConfigSchema(id: string) {
    return this.prisma.capabilityConfigSchema.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  findAllCapabilitiesWithChildren() {
    return this.prisma.capability.findMany({
      where: { deletedAt: null },
      include: {
        modules: { where: { deletedAt: null } },
        features: { where: { deletedAt: null } },
      },
    });
  }

  upsertCapabilityById(
    id: string,
    data: {
      key: string;
      name: string;
      description?: string;
      icon?: string;
      sortOrder: number;
      status: CapabilityStatus;
    },
  ): Promise<Capability> {
    return this.prisma.capability.upsert({
      where: { id },
      create: {
        id,
        key: data.key,
        name: data.name,
        description: data.description,
        icon: data.icon,
        sortOrder: data.sortOrder,
        status: data.status,
      },
      update: {
        name: data.name,
        description: data.description,
        icon: data.icon,
        sortOrder: data.sortOrder,
        deletedAt: null,
      },
    });
  }

  upsertModule(
    capabilityId: string,
    key: string,
    data: { name: string; description?: string; sortOrder: number },
  ): Promise<CapabilityModule> {
    return this.prisma.capabilityModule.upsert({
      where: { capabilityId_key: { capabilityId, key } },
      create: {
        capability: { connect: { id: capabilityId } },
        key,
        name: data.name,
        description: data.description,
        sortOrder: data.sortOrder,
      },
      update: {
        name: data.name,
        description: data.description,
        sortOrder: data.sortOrder,
        deletedAt: null,
      },
    });
  }

  upsertCodeFeature(
    capabilityId: string,
    moduleId: string | null,
    data: {
      key: string;
      name: string;
      description?: string;
      permissionKey?: string;
      limitKey?: string;
      defaultEnabled?: boolean;
      isBillable?: boolean;
    },
    existing?: CapabilityFeature | null,
  ): Promise<CapabilityFeature> {
    if (existing) {
      return this.prisma.capabilityFeature.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          description: data.description,
          moduleId,
          deletedAt: null,
        },
      });
    }

    return this.prisma.capabilityFeature.create({
      data: {
        capability: { connect: { id: capabilityId } },
        ...(moduleId ? { module: { connect: { id: moduleId } } } : {}),
        key: data.key,
        name: data.name,
        description: data.description,
        source: 'CODE',
        permissionKey: data.permissionKey,
        limitKey: data.limitKey,
        defaultEnabled: data.defaultEnabled ?? false,
        isBillable: data.isBillable ?? false,
      },
    });
  }

  findModuleByKey(capabilityId: string, key: string) {
    return this.prisma.capabilityModule.findFirst({
      where: { capabilityId, key, deletedAt: null },
    });
  }

  // --- Registry features (global catalog) ---

  findAllRegistryFeatures() {
    return this.prisma.registryFeature.findMany({
      where: { deletedAt: null },
      orderBy: [{ moduleKey: 'asc' }, { key: 'asc' }],
    });
  }

  findRegistryFeatureByKey(key: string) {
    return this.prisma.registryFeature.findFirst({
      where: { key, deletedAt: null },
    });
  }

  /** Upsert code-backed registry rows on demand (e.g. when assigning modules without seed). */
  async ensureCodeRegistryFeatures(featureKeys: string[]): Promise<void> {
    const uniqueKeys = [...new Set(featureKeys)];
    for (const key of uniqueKeys) {
      const def = getRegistryFeature(key);
      if (!def) continue;

      const existing = await this.findRegistryFeatureByKey(key);
      if (existing?.source === CapabilityFeatureSource.MANUAL) {
        continue;
      }

      await this.upsertCodeRegistryFeature(
        key,
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
        existing,
      );
    }
  }

  upsertCodeRegistryFeature(
    key: string,
    data: {
      moduleKey: string;
      moduleName: string;
      name: string;
      description?: string;
      permissionKey?: string;
      routeKeys?: string[];
      icon?: string;
      defaultEnabled?: boolean;
      isBillable?: boolean;
      limitKey?: string;
    },
    existing?: RegistryFeature | null,
  ): Promise<RegistryFeature> {
    const routeKeys = data.routeKeys?.length ? data.routeKeys : undefined;

    if (existing) {
      return this.prisma.registryFeature.update({
        where: { id: existing.id },
        data: {
          moduleKey: data.moduleKey,
          moduleName: data.moduleName,
          name: data.name,
          description: data.description,
          permissionKey: data.permissionKey,
          ...(routeKeys ? { routeKeys } : {}),
          icon: data.icon,
          deletedAt: null,
        },
      });
    }

    return this.prisma.registryFeature.create({
      data: {
        key,
        moduleKey: data.moduleKey,
        moduleName: data.moduleName,
        name: data.name,
        description: data.description,
        permissionKey: data.permissionKey,
        routeKeys,
        icon: data.icon,
        source: CapabilityFeatureSource.CODE,
        defaultEnabled: data.defaultEnabled ?? false,
        isBillable: data.isBillable ?? false,
        limitKey: data.limitKey,
      },
    });
  }

  createManualRegistryFeature(data: {
    key: string;
    moduleKey: string;
    moduleName: string;
    name: string;
    description?: string;
    permissionKey?: string;
    defaultEnabled?: boolean;
    isBillable?: boolean;
    limitKey?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.registryFeature.create({
      data: {
        ...data,
        source: CapabilityFeatureSource.MANUAL,
      },
    });
  }

  updateRegistryFeature(id: string, data: Prisma.RegistryFeatureUpdateInput) {
    return this.prisma.registryFeature.update({ where: { id }, data });
  }

  // --- Feature assignments (capability ↔ registry) ---

  findFeatureAssignments(capabilityId: string) {
    return this.prisma.capabilityFeatureAssignment.findMany({
      where: { capabilityId, deletedAt: null },
      include: { feature: true },
      orderBy: [{ sortOrder: 'asc' }, { featureKey: 'asc' }],
    });
  }

  findFeatureAssignment(capabilityId: string, featureKey: string) {
    return this.prisma.capabilityFeatureAssignment.findFirst({
      where: { capabilityId, featureKey, deletedAt: null },
      include: { feature: true },
    });
  }

  assignFeatures(
    capabilityId: string,
    featureKeys: string[],
    defaults?: { status?: CapabilityFeatureStatus; sortOrder?: number },
  ) {
    if (featureKeys.length === 0) {
      return Promise.resolve();
    }

    const status = defaults?.status ?? CapabilityFeatureStatus.ACTIVE;
    const sortOrderByKey = new Map(
      featureKeys.map((featureKey, index) => [
        featureKey,
        defaults?.sortOrder ?? index,
      ]),
    );

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.capabilityFeatureAssignment.findMany({
        where: { capabilityId, featureKey: { in: featureKeys } },
        select: { featureKey: true },
      });
      const existingKeys = new Set(existing.map((row) => row.featureKey));

      const keysToCreate = featureKeys.filter((key) => !existingKeys.has(key));
      const keysToRestore = featureKeys.filter((key) => existingKeys.has(key));

      if (keysToCreate.length > 0) {
        await tx.capabilityFeatureAssignment.createMany({
          data: keysToCreate.map((featureKey) => ({
            capabilityId,
            featureKey,
            status,
            sortOrder: sortOrderByKey.get(featureKey) ?? 0,
          })),
        });
      }

      if (keysToRestore.length > 0) {
        await tx.capabilityFeatureAssignment.updateMany({
          where: {
            capabilityId,
            featureKey: { in: keysToRestore },
          },
          data: {
            deletedAt: null,
            status,
          },
        });
      }
    });
  }

  updateFeatureAssignment(
    id: string,
    data: Prisma.CapabilityFeatureAssignmentUpdateInput,
  ) {
    return this.prisma.capabilityFeatureAssignment.update({
      where: { id },
      data,
    });
  }

  unassignFeature(capabilityId: string, featureKey: string) {
    return this.prisma.capabilityFeatureAssignment.updateMany({
      where: { capabilityId, featureKey, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  findAssignedFeatureKeys(capabilityId: string): Promise<string[]> {
    return this.prisma.capabilityFeatureAssignment
      .findMany({
        where: { capabilityId, deletedAt: null },
        select: { featureKey: true },
      })
      .then((rows) => rows.map((r) => r.featureKey));
  }

  countAssignmentsByCapability() {
    return this.prisma.capabilityFeatureAssignment.groupBy({
      by: ['featureKey'],
      where: { deletedAt: null },
      _count: { featureKey: true },
    });
  }

  // --- Module assignments (capability ↔ platform module) ---

  findModuleAssignments(capabilityId: string) {
    return this.prisma.capabilityModuleAssignment.findMany({
      where: { capabilityId, deletedAt: null },
      orderBy: [{ moduleKey: 'asc' }],
    });
  }

  findModuleAssignment(capabilityId: string, moduleKey: string) {
    return this.prisma.capabilityModuleAssignment.findFirst({
      where: { capabilityId, moduleKey, deletedAt: null },
    });
  }

  assignModules(capabilityId: string, moduleKeys: string[]) {
    if (moduleKeys.length === 0) {
      return Promise.resolve();
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.capabilityModuleAssignment.findMany({
        where: { capabilityId, moduleKey: { in: moduleKeys } },
        select: { moduleKey: true },
      });
      const existingKeys = new Set(existing.map((row) => row.moduleKey));

      const keysToCreate = moduleKeys.filter((key) => !existingKeys.has(key));
      const keysToRestore = moduleKeys.filter((key) => existingKeys.has(key));

      if (keysToCreate.length > 0) {
        await tx.capabilityModuleAssignment.createMany({
          data: keysToCreate.map((moduleKey) => ({
            capabilityId,
            moduleKey,
          })),
        });
      }

      if (keysToRestore.length > 0) {
        await tx.capabilityModuleAssignment.updateMany({
          where: {
            capabilityId,
            moduleKey: { in: keysToRestore },
          },
          data: { deletedAt: null },
        });
      }
    });
  }

  unassignModule(capabilityId: string, moduleKey: string) {
    return this.prisma.capabilityModuleAssignment.updateMany({
      where: { capabilityId, moduleKey, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  unassignFeaturesByKeys(capabilityId: string, featureKeys: string[]) {
    if (featureKeys.length === 0) return Promise.resolve({ count: 0 });
    return this.prisma.capabilityFeatureAssignment.updateMany({
      where: {
        capabilityId,
        featureKey: { in: featureKeys },
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
  }
}

export type FeatureAssignmentWithRegistry = CapabilityFeatureAssignment & {
  feature: RegistryFeature;
};
