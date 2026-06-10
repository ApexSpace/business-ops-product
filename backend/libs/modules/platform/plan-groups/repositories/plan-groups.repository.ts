import { Injectable } from '@nestjs/common';
import {
  CapabilityStatus,
  PlanGroupStatus,
  PlanTierStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const groupCounts = {
  _count: {
    select: {
      tiers: { where: { deletedAt: null } },
      featureRows: true,
    },
  },
} as const;

const tierCapabilitiesInclude = {
  capabilities: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      capability: {
        select: { id: true, key: true, name: true, description: true },
      },
    },
  },
  features: {
    orderBy: { sortOrder: 'asc' as const },
  },
} as const;

export type TierFeatureSyncInput = {
  id?: string;
  label: string;
  description?: string;
  included: boolean;
  sortOrder: number;
};

@Injectable()
export class PlanGroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    skip: number,
    take: number,
    filters?: { status?: PlanGroupStatus; search?: string },
  ) {
    const where: Prisma.PlanGroupWhereInput = {
      deletedAt: null,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search
        ? {
            name: { contains: filters.search, mode: 'insensitive' },
          }
        : {}),
    };

    return Promise.all([
      this.prisma.planGroup.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take,
        include: groupCounts,
      }),
      this.prisma.planGroup.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  getStats() {
    const notDeleted = { deletedAt: null };
    return Promise.all([
      this.prisma.planGroup.count({ where: notDeleted }),
      this.prisma.planGroup.count({
        where: { ...notDeleted, status: PlanGroupStatus.PUBLISHED },
      }),
      this.prisma.planGroup.count({
        where: { ...notDeleted, status: PlanGroupStatus.DRAFT },
      }),
      this.prisma.planGroup.count({
        where: { ...notDeleted, status: PlanGroupStatus.ARCHIVED },
      }),
    ]).then(([total, published, draft, archived]) => ({
      total,
      published,
      draft,
      archived,
    }));
  }

  findById(id: string) {
    return this.prisma.planGroup.findUnique({
      where: { id },
      include: {
        ...groupCounts,
        snapshot: { select: { id: true, name: true } },
      },
    });
  }

  findByIdForPricing(id: string) {
    return this.prisma.planGroup.findUnique({
      where: { id },
      include: {
        embedSettings: true,
        featureRows: { orderBy: { sortOrder: 'asc' } },
        tiers: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            capabilities: {
              orderBy: { sortOrder: 'asc' },
              include: {
                capability: {
                  select: {
                    id: true,
                    key: true,
                    name: true,
                    description: true,
                    status: true,
                    deletedAt: true,
                  },
                },
              },
            },
            features: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
  }

  create(data: Prisma.PlanGroupCreateInput) {
    return this.prisma.planGroup.create({
      data,
      include: {
        ...groupCounts,
        snapshot: { select: { id: true, name: true } },
      },
    });
  }

  update(id: string, data: Prisma.PlanGroupUpdateInput) {
    return this.prisma.planGroup.update({
      where: { id },
      data,
      include: {
        ...groupCounts,
        snapshot: { select: { id: true, name: true } },
      },
    });
  }

  delete(id: string) {
    return this.prisma.planGroup.delete({ where: { id } });
  }

  findTiers(planGroupId: string) {
    return this.prisma.planTier.findMany({
      where: { planGroupId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: tierCapabilitiesInclude,
    });
  }

  findTier(planGroupId: string, tierId: string) {
    return this.prisma.planTier.findFirst({
      where: { id: tierId, planGroupId, deletedAt: null },
      include: tierCapabilitiesInclude,
    });
  }

  findTierSlugTaken(planGroupId: string, slug: string, excludeId?: string) {
    return this.prisma.planTier.findFirst({
      where: {
        planGroupId,
        slug,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  createTier(data: Prisma.PlanTierCreateInput) {
    return this.prisma.planTier.create({
      data,
      include: tierCapabilitiesInclude,
    });
  }

  updateTier(id: string, data: Prisma.PlanTierUpdateInput) {
    return this.prisma.planTier.update({
      where: { id },
      data,
      include: tierCapabilitiesInclude,
    });
  }

  softDeleteTier(id: string) {
    return this.prisma.planTier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  getNextTierSortOrder(planGroupId: string) {
    return this.prisma.planTier
      .aggregate({
        where: { planGroupId, deletedAt: null },
        _max: { sortOrder: true },
      })
      .then((r) => (r._max.sortOrder ?? -1) + 1);
  }

  findTierCapability(planTierId: string, capabilityId: string) {
    return this.prisma.planTierCapability.findUnique({
      where: {
        planTierId_capabilityId: { planTierId, capabilityId },
      },
    });
  }

  assignCapabilities(
    planTierId: string,
    capabilityIds: string[],
    startSortOrder: number,
  ) {
    return this.prisma.$transaction(
      capabilityIds.map((capabilityId, index) =>
        this.prisma.planTierCapability.upsert({
          where: {
            planTierId_capabilityId: { planTierId, capabilityId },
          },
          create: {
            planTier: { connect: { id: planTierId } },
            capability: { connect: { id: capabilityId } },
            sortOrder: startSortOrder + index,
          },
          update: {},
        }),
      ),
    );
  }

  removeTierCapability(planTierId: string, capabilityId: string) {
    return this.prisma.planTierCapability.delete({
      where: {
        planTierId_capabilityId: { planTierId, capabilityId },
      },
    });
  }

  reorderTierCapabilities(planTierId: string, capabilityIds: string[]) {
    return this.prisma.$transaction(
      capabilityIds.map((capabilityId, index) =>
        this.prisma.planTierCapability.update({
          where: {
            planTierId_capabilityId: { planTierId, capabilityId },
          },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  syncTierFeatures(planTierId: string, features: TierFeatureSyncInput[]) {
    const keepIds = features
      .map((feature) => feature.id)
      .filter((id): id is string => Boolean(id));

    return this.prisma.$transaction([
      this.prisma.planTierFeature.deleteMany({
        where: {
          planTierId,
          ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {}),
        },
      }),
      ...features.map((feature) => {
        if (feature.id) {
          return this.prisma.planTierFeature.update({
            where: { id: feature.id },
            data: {
              label: feature.label.trim(),
              description: feature.description?.trim(),
              included: feature.included,
              sortOrder: feature.sortOrder,
            },
          });
        }
        return this.prisma.planTierFeature.create({
          data: {
            planTier: { connect: { id: planTierId } },
            label: feature.label.trim(),
            description: feature.description?.trim(),
            included: feature.included,
            sortOrder: feature.sortOrder,
          },
        });
      }),
    ]);
  }

  findCapability(id: string) {
    return this.prisma.capability.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findActiveCapabilities(ids: string[]) {
    return this.prisma.capability.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
        status: CapabilityStatus.ACTIVE,
      },
    });
  }

  findFeatureRows(planGroupId: string) {
    return this.prisma.planFeatureRow.findMany({
      where: { planGroupId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  findFeatureRow(planGroupId: string, rowId: string) {
    return this.prisma.planFeatureRow.findFirst({
      where: { id: rowId, planGroupId },
    });
  }

  createFeatureRow(data: Prisma.PlanFeatureRowCreateInput) {
    return this.prisma.planFeatureRow.create({ data });
  }

  updateFeatureRow(id: string, data: Prisma.PlanFeatureRowUpdateInput) {
    return this.prisma.planFeatureRow.update({ where: { id }, data });
  }

  deleteFeatureRow(id: string) {
    return this.prisma.planFeatureRow.delete({ where: { id } });
  }

  getNextFeatureRowSortOrder(planGroupId: string) {
    return this.prisma.planFeatureRow
      .aggregate({
        where: { planGroupId },
        _max: { sortOrder: true },
      })
      .then((r) => (r._max.sortOrder ?? -1) + 1);
  }

  reorderFeatureRows(planGroupId: string, rowIds: string[]) {
    return this.prisma.$transaction(
      rowIds.map((id, index) =>
        this.prisma.planFeatureRow.update({
          where: { id, planGroupId },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  findEmbedSettings(planGroupId: string) {
    return this.prisma.planEmbedSettings.findUnique({
      where: { planGroupId },
    });
  }

  createEmbedSettings(data: Prisma.PlanEmbedSettingsCreateInput) {
    return this.prisma.planEmbedSettings.create({ data });
  }

  updateEmbedSettings(
    planGroupId: string,
    data: Prisma.PlanEmbedSettingsUpdateInput,
  ) {
    return this.prisma.planEmbedSettings.update({
      where: { planGroupId },
      data,
    });
  }

  countPublishedTiers(planGroupId: string) {
    return this.prisma.planTier.count({
      where: {
        planGroupId,
        deletedAt: null,
        status: PlanTierStatus.PUBLISHED,
      },
    });
  }

  findTiersForPublishValidation(planGroupId: string) {
    return this.prisma.planTier.findMany({
      where: {
        planGroupId,
        deletedAt: null,
        status: { not: PlanTierStatus.ARCHIVED },
      },
    });
  }

  publishAllTiersForGroup(planGroupId: string) {
    return this.prisma.planTier.updateMany({
      where: {
        planGroupId,
        deletedAt: null,
        status: { not: PlanTierStatus.ARCHIVED },
      },
      data: { status: PlanTierStatus.PUBLISHED },
    });
  }

  moveAllTiersToDraftForGroup(planGroupId: string) {
    return this.prisma.planTier.updateMany({
      where: {
        planGroupId,
        deletedAt: null,
        status: PlanTierStatus.PUBLISHED,
      },
      data: { status: PlanTierStatus.DRAFT },
    });
  }

  archiveAllPublishedTiersForGroup(planGroupId: string) {
    return this.prisma.planTier.updateMany({
      where: {
        planGroupId,
        deletedAt: null,
        status: PlanTierStatus.PUBLISHED,
      },
      data: { status: PlanTierStatus.ARCHIVED },
    });
  }
}
