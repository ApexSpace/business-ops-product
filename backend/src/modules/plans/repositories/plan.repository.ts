import { Injectable } from '@nestjs/common';
import { Plan, PlanStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class PlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    skip: number,
    take: number,
    status?: PlanStatus,
  ): Promise<{ items: Plan[]; total: number }> {
    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
    };

    return Promise.all([
      this.prisma.plan.findMany({
        where,
        orderBy: { priceMonthly: 'asc' },
        skip,
        take,
      }),
      this.prisma.plan.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  findById(id: string): Promise<Plan | null> {
    return this.prisma.plan.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findBySlug(slug: string): Promise<Plan | null> {
    return this.prisma.plan.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  create(data: Prisma.PlanCreateInput): Promise<Plan> {
    return this.prisma.plan.create({ data });
  }

  update(id: string, data: Prisma.PlanUpdateInput): Promise<Plan> {
    return this.prisma.plan.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Plan> {
    return this.prisma.plan.update({
      where: { id },
      data: { deletedAt: new Date(), status: PlanStatus.ARCHIVED },
    });
  }

  findAllActive(): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      where: { deletedAt: null, status: PlanStatus.ACTIVE },
      orderBy: { priceMonthly: 'asc' },
    });
  }
}
