import { Injectable } from '@nestjs/common';
import { IntegrationCategory, IntegrationConnectionType, PlatformIntegration, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

export type PlatformIntegrationWithProvider = PlatformIntegration & {
  provider: {
    id: string;
    key: string;
    name: string;
    description: string | null;
    category: IntegrationCategory;
    logoUrl: string | null;
    isPlatformLevel: boolean;
    isBusinessLevel: boolean;
    isActive: boolean;
    sortOrder: number;
    connectionType: IntegrationConnectionType;
  };
};

@Injectable()
export class PlatformIntegrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByKey(
    providerKey: string,
  ): Promise<PlatformIntegrationWithProvider | null> {
    return this.prisma.platformIntegration.findUnique({
      where: { providerKey },
      include: { provider: true },
    });
  }

  findMany(): Promise<PlatformIntegrationWithProvider[]> {
    return this.prisma.platformIntegration.findMany({
      include: { provider: true },
      orderBy: { provider: { sortOrder: 'asc' } },
    });
  }

  findManyByKeys(providerKeys: string[]): Promise<PlatformIntegration[]> {
    if (providerKeys.length === 0) return Promise.resolve([]);
    return this.prisma.platformIntegration.findMany({
      where: { providerKey: { in: providerKeys } },
    });
  }

  upsert(
    providerKey: string,
    data: Omit<Prisma.PlatformIntegrationUncheckedCreateInput, 'providerKey'>,
  ): Promise<PlatformIntegrationWithProvider> {
    return this.prisma.platformIntegration.upsert({
      where: { providerKey },
      create: { providerKey, ...data },
      update: data,
      include: { provider: true },
    });
  }

  update(
    providerKey: string,
    data: Prisma.PlatformIntegrationUpdateInput,
  ): Promise<PlatformIntegrationWithProvider> {
    return this.prisma.platformIntegration.update({
      where: { providerKey },
      data,
      include: { provider: true },
    });
  }

  delete(providerKey: string): Promise<void> {
    return this.prisma.platformIntegration
      .delete({ where: { providerKey } })
      .then(() => undefined);
  }
}
