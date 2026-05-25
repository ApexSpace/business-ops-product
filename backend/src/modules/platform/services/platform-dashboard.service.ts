import { Injectable } from '@nestjs/common';
import { BusinessStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { PlatformDashboardStatsDto } from '../dto/platform-dashboard-stats.dto';

@Injectable()
export class PlatformDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<PlatformDashboardStatsDto> {
    const businessWhere = { deletedAt: null };

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
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        },
      }),
      this.prisma.businessSubscription.findMany({
        where: {
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        },
        include: { plan: true },
      }),
    ]);

    const statusCounts: Record<BusinessStatus, number> = {
      ACTIVE: 0,
      SUSPENDED: 0,
      ARCHIVED: 0,
    };

    for (const row of businessCounts) {
      statusCounts[row.status] = row._count._all;
    }

    const totalBusinesses =
      statusCounts.ACTIVE + statusCounts.SUSPENDED + statusCounts.ARCHIVED;

    const mrr = subscriptionRows.reduce((sum, sub) => {
      const monthly = Number(sub.plan.priceMonthly);
      return sum + monthly;
    }, 0);

    return {
      businesses: {
        total: totalBusinesses,
        active: statusCounts.ACTIVE,
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
