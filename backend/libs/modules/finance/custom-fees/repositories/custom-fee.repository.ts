import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import { CustomFee, Prisma } from '@prisma/client';

@Injectable()
export class CustomFeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  private activeWhere(
    businessId: string,
    extra?: Prisma.CustomFeeWhereInput,
  ): Prisma.CustomFeeWhereInput {
    return {
      businessId,
      deletedAt: null,
      ...extra,
    };
  }

  findMany(
    businessId: string,
    params: { skip: number; take: number; search?: string },
  ): Promise<{ items: CustomFee[]; total: number }> {
    const where = this.activeWhere(businessId);
    if (params.search?.trim()) {
      where.name = { contains: params.search.trim(), mode: 'insensitive' };
    }

    return Promise.all([
      this.prisma.customFee.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.customFee.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  findEnabled(businessId: string): Promise<CustomFee[]> {
    return this.prisma.customFee.findMany({
      where: this.activeWhere(businessId, { isEnabled: true }),
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findById(businessId: string, id: string): Promise<CustomFee | null> {
    return this.prisma.customFee.findFirst({
      where: this.activeWhere(businessId, { id }),
    });
  }

  nextSortOrder(businessId: string): Promise<number> {
    return this.prisma.customFee
      .aggregate({
        where: this.activeWhere(businessId),
        _max: { sortOrder: true },
      })
      .then((row) => (row._max.sortOrder ?? -1) + 1);
  }

  create(
    businessId: string,
    data: Omit<Prisma.CustomFeeUncheckedCreateInput, 'businessId'>,
  ): Promise<CustomFee> {
    return this.prisma.customFee.create({
      data: {
        ...data,
        businessId,
      },
    });
  }

  update(
    businessId: string,
    id: string,
    data: Prisma.CustomFeeUpdateInput,
  ): Promise<CustomFee> {
    return this.prisma.customFee.update({
      where: { id, businessId },
      data,
    });
  }

  softDelete(businessId: string, id: string): Promise<CustomFee> {
    return this.prisma.customFee.update({
      where: { id, businessId },
      data: { deletedAt: new Date(), isEnabled: false },
    });
  }
}
