import { Injectable } from '@nestjs/common';
import {
  IntegrationResource,
  IntegrationResourceStatus,
  IntegrationResourceType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

export type UpsertIntegrationResourceInput = {
  externalId: string;
  name: string;
  type: IntegrationResourceType;
  metadata?: Prisma.InputJsonValue;
  status?: IntegrationResourceStatus;
  lastSyncedAt?: Date;
  isSelected?: boolean;
  isDefault?: boolean;
};

@Injectable()
export class IntegrationResourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByIntegration(
    businessIntegrationId: string,
  ): Promise<IntegrationResource[]> {
    return this.prisma.integrationResource.findMany({
      where: { businessIntegrationId },
      orderBy: [{ isDefault: 'desc' }, { isSelected: 'desc' }, { name: 'asc' }],
    });
  }

  findManyByBusinessAndProvider(
    businessId: string,
    providerKey: string,
  ): Promise<IntegrationResource[]> {
    return this.prisma.integrationResource.findMany({
      where: { businessId, providerKey },
      orderBy: [{ isDefault: 'desc' }, { isSelected: 'desc' }, { name: 'asc' }],
    });
  }

  /** Counts ACTIVE resources per providerKey for a business (for catalog badges). */
  async countByBusinessGroupedByProvider(
    businessId: string,
  ): Promise<Map<string, number>> {
    const rows = await this.prisma.integrationResource.groupBy({
      by: ['providerKey'],
      where: {
        businessId,
        status: IntegrationResourceStatus.ACTIVE,
      },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.providerKey, row._count._all]));
  }

  findByIdAndBusiness(
    id: string,
    businessId: string,
  ): Promise<IntegrationResource | null> {
    return this.prisma.integrationResource.findFirst({
      where: { id, businessId },
    });
  }

  findActiveByExternalId(
    externalId: string,
    providerKey: string,
    type: IntegrationResourceType,
  ): Promise<IntegrationResource | null> {
    return this.prisma.integrationResource.findFirst({
      where: {
        externalId,
        providerKey,
        type,
        status: IntegrationResourceStatus.ACTIVE,
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  findBySlugForProvider(
    providerKey: string,
    slug: string,
    excludeBusinessId?: string,
  ): Promise<IntegrationResource | null> {
    return this.prisma.integrationResource.findFirst({
      where: {
        providerKey,
        type: IntegrationResourceType.EMAIL_ACCOUNT,
        ...(excludeBusinessId
          ? { businessId: { not: excludeBusinessId } }
          : {}),
        metadata: {
          path: ['slug'],
          equals: slug,
        },
      },
    });
  }

  findDefault(
    businessId: string,
    providerKey: string,
    type: IntegrationResourceType,
  ): Promise<IntegrationResource | null> {
    return this.prisma.integrationResource.findFirst({
      where: {
        businessId,
        providerKey,
        type,
        isDefault: true,
        status: IntegrationResourceStatus.ACTIVE,
      },
    });
  }

  findSelected(
    businessId: string,
    providerKey: string,
    type?: IntegrationResourceType,
  ): Promise<IntegrationResource[]> {
    return this.prisma.integrationResource.findMany({
      where: {
        businessId,
        providerKey,
        isSelected: true,
        status: IntegrationResourceStatus.ACTIVE,
        ...(type ? { type } : {}),
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  upsertMany(
    businessIntegrationId: string,
    businessId: string,
    providerKey: string,
    items: UpsertIntegrationResourceInput[],
  ): Promise<IntegrationResource[]> {
    return this.prisma.$transaction(
      items.map((item) =>
        this.prisma.integrationResource.upsert({
          where: {
            businessIntegrationId_externalId: {
              businessIntegrationId,
              externalId: item.externalId,
            },
          },
          create: {
            businessIntegrationId,
            businessId,
            providerKey,
            externalId: item.externalId,
            name: item.name,
            type: item.type,
            metadata: item.metadata,
            status: item.status ?? IntegrationResourceStatus.ACTIVE,
            lastSyncedAt: item.lastSyncedAt,
            isSelected: item.isSelected ?? false,
            isDefault: item.isDefault ?? false,
          },
          update: {
            name: item.name,
            metadata: item.metadata,
            status: item.status ?? IntegrationResourceStatus.ACTIVE,
            lastSyncedAt: item.lastSyncedAt,
            ...(item.isSelected !== undefined
              ? { isSelected: item.isSelected }
              : {}),
            ...(item.isDefault !== undefined
              ? { isDefault: item.isDefault }
              : {}),
          },
        }),
      ),
    );
  }

  update(
    id: string,
    data: Prisma.IntegrationResourceUpdateInput,
  ): Promise<IntegrationResource> {
    return this.prisma.integrationResource.update({ where: { id }, data });
  }

  /** Soft-deactivate resources whose externalId is not in the keep set (path switch / resync). */
  async deactivateMissingExternalIds(
    businessIntegrationId: string,
    keepExternalIds: string[],
  ): Promise<number> {
    const result = await this.prisma.integrationResource.updateMany({
      where: {
        businessIntegrationId,
        status: IntegrationResourceStatus.ACTIVE,
        ...(keepExternalIds.length > 0
          ? { externalId: { notIn: keepExternalIds } }
          : {}),
      },
      data: {
        status: IntegrationResourceStatus.INACTIVE,
        isDefault: false,
        isSelected: false,
      },
    });
    return result.count;
  }

  clearDefaultForType(
    businessIntegrationId: string,
    type: IntegrationResourceType,
    excludeId?: string,
  ): Promise<void> {
    return this.prisma.integrationResource
      .updateMany({
        where: {
          businessIntegrationId,
          type,
          isDefault: true,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        data: { isDefault: false },
      })
      .then(() => undefined);
  }
}
