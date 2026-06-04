import { Injectable } from '@nestjs/common';
import {
  BusinessSubscription,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';

const subscriptionInclude = {
  business: { select: { id: true, name: true, slug: true } },
  plan: { select: { id: true, name: true, priceMonthly: true } },
} satisfies Prisma.BusinessSubscriptionInclude;

export type SubscriptionWithRelations = Prisma.BusinessSubscriptionGetPayload<{
  include: typeof subscriptionInclude;
}>;

@Injectable()
export class BusinessSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(
    skip: number,
    take: number,
    status?: SubscriptionStatus,
  ): Promise<{ items: SubscriptionWithRelations[]; total: number }> {
    const where = status ? { status } : {};

    return Promise.all([
      this.prisma.businessSubscription.findMany({
        where,
        include: subscriptionInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.businessSubscription.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  findByBusinessId(
    businessId: string,
  ): Promise<SubscriptionWithRelations | null> {
    return this.prisma.businessSubscription.findUnique({
      where: { businessId },
      include: subscriptionInclude,
    });
  }

  create(data: {
    businessId: string;
    planId: string;
    status?: SubscriptionStatus;
    currentPeriodEnd?: Date | null;
  }): Promise<SubscriptionWithRelations> {
    return this.prisma.businessSubscription.create({
      data,
      include: subscriptionInclude,
    });
  }

  update(
    businessId: string,
    data: Prisma.BusinessSubscriptionUpdateInput,
  ): Promise<SubscriptionWithRelations> {
    return this.prisma.businessSubscription.update({
      where: { businessId },
      data,
      include: subscriptionInclude,
    });
  }

  countByStatus(): Promise<Record<SubscriptionStatus, number>> {
    return this.prisma.businessSubscription
      .groupBy({
        by: ['status'],
        _count: { _all: true },
      })
      .then((rows) => {
        const counts: Record<SubscriptionStatus, number> = {
          ACTIVE: 0,
          TRIALING: 0,
          PAST_DUE: 0,
          CANCELED: 0,
        };
        for (const row of rows) {
          counts[row.status] = row._count._all;
        }
        return counts;
      });
  }

  getMrr(): Promise<number> {
    return this.prisma.businessSubscription
      .findMany({
        where: {
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
        },
        include: { plan: true },
      })
      .then((subs) =>
        subs.reduce((sum, sub) => sum + Number(sub.plan.priceMonthly), 0),
      );
  }
}
