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

  findByIdAndBusiness(
    id: string,
    businessId: string,
  ): Promise<IntegrationResource | null> {
    return this.prisma.integrationResource.findFirst({
      where: { id, businessId },
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
            ...(item.isDefault !== undefined ? { isDefault: item.isDefault } : {}),
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
