import { Injectable } from '@nestjs/common';
import { Business, BusinessStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

@Injectable()
export class BusinessRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.BusinessCreateInput): Promise<Business> {
    return this.prisma.business.create({ data });
  }

  findById(id: string, includeDeleted = false) {
    return this.prisma.business.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
      include: { industry: true, snapshot: true },
    });
  }

  findBySlug(slug: string): Promise<Business | null> {
    return this.prisma.business.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  findAllActive(): Promise<Business[]> {
    return this.prisma.business.findMany({
      where: {
        deletedAt: null,
        status: BusinessStatus.ACTIVE,
      },
      orderBy: { name: 'asc' },
    });
  }

  findMany(params: {
    skip: number;
    take: number;
    status?: BusinessStatus;
    search?: string;
    includeDeleted?: boolean;
  }): Promise<{ items: Business[]; total: number }> {
    const search = params.search?.trim();
    const where: Prisma.BusinessWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.includeDeleted ? {} : { deletedAt: null }),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return Promise.all([
      this.prisma.business.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: 'desc' },
        include: { industry: true, snapshot: true },
      }),
      this.prisma.business.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  update(id: string, data: Prisma.BusinessUpdateInput) {
    return this.prisma.business.update({
      where: { id },
      data,
      include: { industry: true, snapshot: true },
    });
  }

  softDelete(id: string): Promise<Business> {
    return this.prisma.business.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({ where: { businessId: id } });
      await tx.business.delete({ where: { id } });
    });
  }
}
