import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  ConversationStatus,
  LeadStatus,
  MembershipStatus,
  PaymentStatus,
  Prisma,
  ProductType,
  WorkItemStatus,
} from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  getBusinessDayBoundariesUtc,
  normalizeTimezone,
} from '@app/common/utils/timezone.util';
import { buildOverdueInvoiceWhere } from '@app/modules/finance/shared/utils/overdue-invoice-where.util';
import { BusinessDashboardStatsDto } from '../dto/business-dashboard-stats.dto';

@Injectable()
export class DashboardStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(
    businessId: string,
    options?: {
      assignedToId?: string;
      includeBusinessOps?: boolean;
    },
  ): Promise<BusinessDashboardStatsDto> {
    const includeBusinessOps = options?.includeBusinessOps !== false;
    const assigneeWhere: Prisma.AppointmentWhereInput = options?.assignedToId
      ? {
          OR: [
            { assignedToId: options.assignedToId },
            {
              serviceLines: {
                some: { assignedToId: options.assignedToId },
              },
            },
          ],
        }
      : {};

    const leadWhere = { businessId, deletedAt: null };

    const workItemWhere = { businessId, deletedAt: null };

    const appointmentWhere: Prisma.AppointmentWhereInput = {
      businessId,
      deletedAt: null,
      ...assigneeWhere,
    };

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true },
    });
    const timezone = normalizeTimezone(business?.timezone);
    const { startOfToday, endOfToday, now } = getBusinessDayBoundariesUtc(
      business?.timezone,
    );

    const yesterday = DateTime.now().setZone(timezone).minus({ days: 1 });
    const startOfYesterday = yesterday.startOf('day').toUTC().toJSDate();
    const endOfYesterday = yesterday.endOf('day').toUTC().toJSDate();

    const paymentBaseWhere: Prisma.PaymentWhereInput = {
      businessId,
      deletedAt: null,
      status: PaymentStatus.SUCCEEDED,
    };

    const paymentInRange = (
      start: Date,
      end: Date,
    ): Prisma.PaymentWhereInput => ({
      ...paymentBaseWhere,
      OR: [
        { paidAt: { gte: start, lte: end } },
        {
          paidAt: null,
          createdAt: { gte: start, lte: end },
        },
      ],
    });

    const conversationWhere = { businessId, deletedAt: null };

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
      openConversations,
      unreadConversations,
      revenueTodayAgg,
      revenueYesterdayAgg,
      overdueAgg,
      lowStockProducts,
    ] = await Promise.all([
      this.prisma.contact.count({
        where: { businessId, deletedAt: null },
      }),
      includeBusinessOps
        ? this.prisma.lead.groupBy({
            by: ['status'],
            where: leadWhere,
            _count: { _all: true },
          })
        : Promise.resolve([] as Array<{ status: LeadStatus; _count: { _all: number } }>),
      includeBusinessOps
        ? this.prisma.pipeline.count({ where: { businessId } })
        : Promise.resolve(0),
      this.prisma.businessMembership.count({
        where: {
          businessId,
          deletedAt: null,
          status: MembershipStatus.ACTIVE,
        },
      }),
      includeBusinessOps
        ? this.prisma.workItem.count({ where: workItemWhere })
        : Promise.resolve(0),
      includeBusinessOps
        ? this.prisma.workItem.count({
            where: { ...workItemWhere, status: WorkItemStatus.SCHEDULED },
          })
        : Promise.resolve(0),
      includeBusinessOps
        ? this.prisma.workItem.count({
            where: { ...workItemWhere, status: WorkItemStatus.COMPLETED },
          })
        : Promise.resolve(0),
      includeBusinessOps
        ? this.prisma.workItem.count({
            where: {
              ...workItemWhere,
              status: {
                in: [WorkItemStatus.DRAFT, WorkItemStatus.IN_PROGRESS],
              },
            },
          })
        : Promise.resolve(0),
      this.prisma.appointment.count({ where: appointmentWhere }),
      this.prisma.appointment.count({
        where: {
          ...appointmentWhere,
          startAt: { gte: startOfToday, lte: endOfToday },
          status: {
            in: [AppointmentStatus.UNCONFIRMED, AppointmentStatus.CONFIRMED],
          },
        },
      }),
      this.prisma.appointment.count({
        where: {
          ...appointmentWhere,
          startAt: { gte: now },
          status: {
            in: [AppointmentStatus.UNCONFIRMED, AppointmentStatus.CONFIRMED],
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
      includeBusinessOps
        ? this.prisma.conversation.count({
            where: {
              ...conversationWhere,
              status: ConversationStatus.OPEN,
            },
          })
        : Promise.resolve(0),
      includeBusinessOps
        ? this.prisma.conversation.count({
            where: {
              ...conversationWhere,
              unreadCount: { gt: 0 },
            },
          })
        : Promise.resolve(0),
      includeBusinessOps
        ? this.prisma.payment.aggregate({
            where: paymentInRange(startOfToday, endOfToday),
            _count: { _all: true },
            _sum: { amount: true },
          })
        : Promise.resolve({
            _count: { _all: 0 },
            _sum: { amount: null },
          }),
      includeBusinessOps
        ? this.prisma.payment.aggregate({
            where: paymentInRange(startOfYesterday, endOfYesterday),
            _count: { _all: true },
            _sum: { amount: true },
          })
        : Promise.resolve({
            _count: { _all: 0 },
            _sum: { amount: null },
          }),
      includeBusinessOps
        ? this.prisma.invoice.aggregate({
            where: buildOverdueInvoiceWhere(businessId, startOfToday),
            _count: { _all: true },
            _sum: { balanceDue: true },
          })
        : Promise.resolve({
            _count: { _all: 0 },
            _sum: { balanceDue: null },
          }),
      includeBusinessOps
        ? this.countLowStockProducts(businessId)
        : Promise.resolve(0),
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
      conversations: openConversations,
      members,
      workItems: {
        total: workItemsTotal,
        scheduled: workItemsScheduled,
        completed: workItemsCompleted,
        pending: workItemsPending,
      },
      revenueToday: {
        amount: this.decimalString(revenueTodayAgg._sum.amount),
        paymentCount: revenueTodayAgg._count._all,
      },
      revenueYesterday: {
        amount: this.decimalString(revenueYesterdayAgg._sum.amount),
        paymentCount: revenueYesterdayAgg._count._all,
      },
      attention: {
        overdueInvoices: overdueAgg._count._all,
        overdueInvoiceBalance: this.decimalString(overdueAgg._sum.balanceDue),
        lowStockProducts,
        unreadConversations,
      },
    };
  }

  private async countLowStockProducts(businessId: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM products
      WHERE "businessId" = ${businessId}
        AND "deletedAt" IS NULL
        AND "trackInventory" = true
        AND "productType" = ${ProductType.SIMPLE}::"ProductType"
        AND "stockQuantity" <= COALESCE("desiredQuantity", 0)
    `;
    return Number(rows[0]?.count ?? 0);
  }

  private decimalString(value: Prisma.Decimal | null | undefined): string {
    if (!value) {
      return '0.00';
    }
    return value.toFixed(2);
  }
}
