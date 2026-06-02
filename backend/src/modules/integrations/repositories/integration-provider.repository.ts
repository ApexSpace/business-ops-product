import { Injectable } from '@nestjs/common';
import {
  IntegrationCategory,
  IntegrationProvider,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class IntegrationProviderRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByKey(key: string): Promise<IntegrationProvider | null> {
    return this.prisma.integrationProvider.findUnique({ where: { key } });
  }

  findById(id: string): Promise<IntegrationProvider | null> {
    return this.prisma.integrationProvider.findUnique({ where: { id } });
  }

  findActiveBusinessProviders(): Promise<IntegrationProvider[]> {
    return this.prisma.integrationProvider.findMany({
      where: { isActive: true, isBusinessLevel: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findActivePlatformProviders(): Promise<IntegrationProvider[]> {
    return this.prisma.integrationProvider.findMany({
      where: { isActive: true, isPlatformLevel: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findAll(): Promise<IntegrationProvider[]> {
    return this.prisma.integrationProvider.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  create(
    data: Prisma.IntegrationProviderCreateInput,
  ): Promise<IntegrationProvider> {
    return this.prisma.integrationProvider.create({ data });
  }

  update(
    id: string,
    data: Prisma.IntegrationProviderUpdateInput,
  ): Promise<IntegrationProvider> {
    return this.prisma.integrationProvider.update({ where: { id }, data });
  }

  findByCategory(
    category: IntegrationCategory,
    level: 'business' | 'platform',
  ): Promise<IntegrationProvider[]> {
    const levelFilter =
      level === 'business'
        ? { isBusinessLevel: true }
        : { isPlatformLevel: true };

    return this.prisma.integrationProvider.findMany({
      where: { isActive: true, category, ...levelFilter },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }
}
