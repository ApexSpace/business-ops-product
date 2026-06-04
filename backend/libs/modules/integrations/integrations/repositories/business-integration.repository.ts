import { Injectable } from '@nestjs/common';
import { BusinessIntegration, IntegrationCategory, IntegrationConnectionType, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

export type BusinessIntegrationWithProvider = BusinessIntegration & {
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
export class BusinessIntegrationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByBusinessAndKey(
    businessId: string,
    providerKey: string,
  ): Promise<BusinessIntegrationWithProvider | null> {
    return this.prisma.businessIntegration.findUnique({
      where: {
        businessId_providerKey: { businessId, providerKey },
      },
      include: { provider: true },
    });
  }

  findManyByBusiness(
    businessId: string,
  ): Promise<BusinessIntegrationWithProvider[]> {
    return this.prisma.businessIntegration.findMany({
      where: { businessId },
      include: { provider: true },
      orderBy: { provider: { sortOrder: 'asc' } },
    });
  }

  findManyByProviderKey(
    providerKey: string,
  ): Promise<BusinessIntegrationWithProvider[]> {
    return this.prisma.businessIntegration.findMany({
      where: { providerKey },
      include: { provider: true },
    });
  }

  findManyByBusinessIds(
    businessId: string,
    providerKeys: string[],
  ): Promise<BusinessIntegration[]> {
    if (providerKeys.length === 0) return Promise.resolve([]);
    return this.prisma.businessIntegration.findMany({
      where: { businessId, providerKey: { in: providerKeys } },
    });
  }

  upsert(
    businessId: string,
    providerKey: string,
    data: Omit<
      Prisma.BusinessIntegrationUncheckedCreateInput,
      'businessId' | 'providerKey'
    >,
  ): Promise<BusinessIntegrationWithProvider> {
    return this.prisma.businessIntegration.upsert({
      where: {
        businessId_providerKey: { businessId, providerKey },
      },
      create: { businessId, providerKey, ...data },
      update: data,
      include: { provider: true },
    });
  }

  update(
    businessId: string,
    providerKey: string,
    data: Prisma.BusinessIntegrationUpdateInput,
  ): Promise<BusinessIntegrationWithProvider> {
    return this.prisma.businessIntegration.update({
      where: {
        businessId_providerKey: { businessId, providerKey },
      },
      data,
      include: { provider: true },
    });
  }

  delete(businessId: string, providerKey: string): Promise<void> {
    return this.prisma.businessIntegration
      .delete({
        where: {
          businessId_providerKey: { businessId, providerKey },
        },
      })
      .then(() => undefined);
  }
}
