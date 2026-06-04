import { Injectable } from '@nestjs/common';
import { Industry, IndustryStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class IndustryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<Industry | null> {
    return this.prisma.industry.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findBySlug(slug: string): Promise<Industry | null> {
    return this.prisma.industry.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  findMany(params: {
    skip: number;
    take: number;
    status?: IndustryStatus;
  }): Promise<{ items: Industry[]; total: number }> {
    const where: Prisma.IndustryWhereInput = {
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
    };

    return Promise.all([
      this.prisma.industry.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.industry.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  findAllActive(): Promise<Industry[]> {
    return this.prisma.industry.findMany({
      where: { deletedAt: null, status: IndustryStatus.ACTIVE },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  create(data: Prisma.IndustryCreateInput): Promise<Industry> {
    return this.prisma.industry.create({ data });
  }

  update(id: string, data: Prisma.IndustryUpdateInput): Promise<Industry> {
    return this.prisma.industry.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Industry> {
    return this.prisma.industry.update({
      where: { id },
      data: { deletedAt: new Date(), status: IndustryStatus.ARCHIVED },
    });
  }

  countBusinesses(id: string): Promise<number> {
    return this.prisma.business.count({
      where: { industryId: id, deletedAt: null },
    });
  }
}
