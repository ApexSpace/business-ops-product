import { Injectable } from '@nestjs/common';
import { LeadStatus, MembershipStatus } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { BusinessDashboardStatsDto } from '../dto/business-dashboard-stats.dto';

@Injectable()
export class DashboardStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(businessId: string): Promise<BusinessDashboardStatsDto> {
    const leadWhere = { businessId, deletedAt: null };

    const [
      contacts,
      leadsByStatus,
      pipelines,
      members,
    ] = await Promise.all([
      this.prisma.contact.count({
        where: { businessId, deletedAt: null },
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: leadWhere,
        _count: { _all: true },
      }),
      this.prisma.pipeline.count({ where: { businessId } }),
      this.prisma.businessMembership.count({
        where: {
          businessId,
          deletedAt: null,
          status: MembershipStatus.ACTIVE,
        },
      }),
    ]);

    const leadCounts: Record<LeadStatus, number> = {
      ACTIVE: 0,
      WON: 0,
      LOST: 0,
      ARCHIVED: 0,
    };

    for (const row of leadsByStatus) {
      leadCounts[row.status] = row._count._all;
    }

    const total =
      leadCounts.ACTIVE +
      leadCounts.WON +
      leadCounts.LOST +
      leadCounts.ARCHIVED;

    return {
      contacts,
      leads: {
        total,
        active: leadCounts.ACTIVE,
        won: leadCounts.WON,
        lost: leadCounts.LOST,
        archived: leadCounts.ARCHIVED,
      },
      pipelines,
      appointments: 0,
      conversations: 0,
      members,
    };
  }
}
