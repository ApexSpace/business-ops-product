import { Injectable } from '@nestjs/common';
import {
  BusinessStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { PlatformDashboardStatsDto } from '../dto/platform-dashboard-stats.dto';
import {
  customerBusinessRelationWhere,
  customerBusinessWhere,
} from '@app/modules/platform/business/utils/tenant-business-scope.util';

@Injectable()
export class PlatformDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<PlatformDashboardStatsDto> {
    const businessWhere = customerBusinessWhere({ deletedAt: null });
    const tenantSubscriptionWhere = {
      business: customerBusinessRelationWhere(),
    };

    const [
      businessCounts,
      platformUsers,
      totalUsers,
      contacts,
      leads,
      activeSubscriptions,
      subscriptionRows,
    ] = await Promise.all([
      this.prisma.business.groupBy({
        by: ['status'],
        where: businessWhere,
        _count: { _all: true },
      }),
      this.prisma.platformMembership.count({ where: { deletedAt: null } }),
      this.prisma.user.count(),
      this.prisma.contact.count({ where: { deletedAt: null } }),
      this.prisma.lead.count({ where: { deletedAt: null } }),
      this.prisma.businessSubscription.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
          ...tenantSubscriptionWhere,
        },
      }),
      this.prisma.businessSubscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          ...tenantSubscriptionWhere,
        },
        include: { planTier: { select: { priceMonthly: true } } },
      }),
    ]);

    const statusCounts: Record<BusinessStatus, number> = {
      ACTIVE: 0,
      NOT_ACTIVE: 0,
      SUSPENDED: 0,
      BLOCKED: 0,
      ARCHIVED: 0,
    };

    for (const row of businessCounts) {
      statusCounts[row.status] = row._count._all;
    }

    const totalBusinesses =
      statusCounts.ACTIVE +
      statusCounts.NOT_ACTIVE +
      statusCounts.SUSPENDED +
      statusCounts.BLOCKED +
      statusCounts.ARCHIVED;

    const mrr = subscriptionRows.reduce((sum, sub) => {
      const monthly = sub.amount
        ? Number(sub.amount)
        : sub.planTier?.priceMonthly
          ? Number(sub.planTier.priceMonthly)
          : 0;
      return sum + monthly;
    }, 0);

    return {
      businesses: {
        total: totalBusinesses,
        active: statusCounts.ACTIVE,
        notActive: statusCounts.NOT_ACTIVE,
        suspended: statusCounts.SUSPENDED,
        archived: statusCounts.ARCHIVED,
      },
      platformUsers,
      totalUsers,
      contacts,
      leads,
      activeSubscriptions,
      mrr: mrr.toFixed(2),
    };
  }
}
