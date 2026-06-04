import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  LeadStatus,
  MembershipStatus,
  WorkItemStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { getBusinessDayBoundariesUtc } from '@app/common/utils/timezone.util';
import { BusinessDashboardStatsDto } from '../dto/business-dashboard-stats.dto';

@Injectable()
export class DashboardStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(businessId: string): Promise<BusinessDashboardStatsDto> {
    const leadWhere = { businessId, deletedAt: null };

    const workItemWhere = { businessId, deletedAt: null };

    const appointmentWhere = { businessId, deletedAt: null };

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true },
    });
    const { startOfToday, endOfToday, now } = getBusinessDayBoundariesUtc(
      business?.timezone,
    );

    const [
      contacts,
      leadsByStatus,
      pipelines,
      members,
      workItemsTotal,
      workItemsScheduled,
      workItemsCompleted,
      workItemsPending,
      appointmentsTotal,
      appointmentsToday,
      appointmentsUpcoming,
      appointmentsCancelledOrNoShow,
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
      this.prisma.workItem.count({ where: workItemWhere }),
      this.prisma.workItem.count({
        where: { ...workItemWhere, status: WorkItemStatus.SCHEDULED },
      }),
      this.prisma.workItem.count({
        where: { ...workItemWhere, status: WorkItemStatus.COMPLETED },
      }),
      this.prisma.workItem.count({
        where: {
          ...workItemWhere,
          status: {
            in: [WorkItemStatus.DRAFT, WorkItemStatus.IN_PROGRESS],
          },
        },
      }),
      this.prisma.appointment.count({ where: appointmentWhere }),
      this.prisma.appointment.count({
        where: {
          ...appointmentWhere,
          startAt: { gte: startOfToday, lte: endOfToday },
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
          },
        },
      }),
      this.prisma.appointment.count({
        where: {
          ...appointmentWhere,
          startAt: { gte: now },
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
          },
        },
      }),
      this.prisma.appointment.count({
        where: {
          ...appointmentWhere,
          status: {
            in: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
          },
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
      appointments: appointmentsTotal,
      appointmentStats: {
        today: appointmentsToday,
        upcoming: appointmentsUpcoming,
        cancelledOrNoShow: appointmentsCancelledOrNoShow,
      },
      conversations: 0,
      members,
      workItems: {
        total: workItemsTotal,
        scheduled: workItemsScheduled,
        completed: workItemsCompleted,
        pending: workItemsPending,
      },
    };
  }
}
