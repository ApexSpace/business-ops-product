import { Injectable } from '@nestjs/common';
import {
  AppointmentSource,
  AppointmentStatus,
  ConversationStatus,
  InvoiceStatus,
  Prisma,
  ProductType,
  TaskStatus,
} from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  getBusinessDayBoundariesUtc,
  normalizeTimezone,
} from '@app/common/utils/timezone.util';
import { buildOverdueInvoiceWhere } from '@app/modules/finance/shared/utils/overdue-invoice-where.util';
import {
  BusinessDashboardFeedDto,
  DashboardAttentionItemDto,
  DashboardBookingSourceDto,
  DashboardFeedAppointmentDto,
  DashboardOverviewDto,
  DashboardRecentConversationDto,
  DashboardRevenueCategoryDto,
  DashboardTaskItemDto,
  DashboardTrendMetricDto,
} from '../dto/business-dashboard-feed.dto';
import { BusinessDashboardStatsDto } from '../dto/business-dashboard-stats.dto';
import { DashboardStatsService } from './dashboard-stats.service';

@Injectable()
export class DashboardFeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardStatsService: DashboardStatsService,
  ) {}

  async getFeed(businessId: string): Promise<BusinessDashboardFeedDto> {
    const timezone = await this.getBusinessTimezone(businessId);
    const { startOfToday, endOfToday, now } =
      getBusinessDayBoundariesUtc(timezone);
    const nowLocal = DateTime.now().setZone(timezone);
    const recentConversationFloor = nowLocal
      .minus({ days: 7 })
      .startOf('day')
      .toUTC()
      .toJSDate();
    const confirmWindowEnd = nowLocal
      .plus({ days: 7 })
      .endOf('day')
      .toUTC()
      .toJSDate();
    const currentPeriodStart = nowLocal.startOf('month').toUTC().toJSDate();
    const previousPeriodStart = nowLocal
      .startOf('month')
      .minus({ months: 1 })
      .toUTC()
      .toJSDate();
    const previousPeriodEnd = nowLocal
      .startOf('month')
      .minus({ milliseconds: 1 })
      .toUTC()
      .toJSDate();
    const trailingSevenDayStart = nowLocal
      .minus({ days: 6 })
      .startOf('day')
      .toUTC()
      .toJSDate();
    const previousSevenDayStart = nowLocal
      .minus({ days: 13 })
      .startOf('day')
      .toUTC()
      .toJSDate();
    const previousSevenDayEnd = nowLocal
      .minus({ days: 7 })
      .endOf('day')
      .toUTC()
      .toJSDate();

    const [
      stats,
      overview,
      todayAppointmentsMetric,
      newLeadsMetric,
      todayAppointments,
      appointmentsToConfirm,
      recentConversations,
      followUpTasks,
      staffAssignments,
      revenueByCategory,
      bookingsBySource,
    ] = await Promise.all([
      this.dashboardStatsService.getStats(businessId),
      this.getOverview(businessId, now, endOfToday),
      this.getTodayAppointmentsMetric(
        businessId,
        timezone,
        previousSevenDayStart,
        trailingSevenDayStart,
        endOfToday,
      ),
      this.getNewLeadsMetric(
        businessId,
        timezone,
        trailingSevenDayStart,
        previousSevenDayStart,
        previousSevenDayEnd,
        endOfToday,
      ),
      this.listTodayAppointments(businessId, startOfToday, endOfToday),
      this.listAppointmentsToConfirm(businessId, now, confirmWindowEnd),
      this.listRecentConversations(businessId, recentConversationFloor),
      this.listFollowUpTasks(businessId, startOfToday, endOfToday),
      this.listStaffAssignments(businessId, endOfToday),
      this.listRevenueByCategory(businessId, currentPeriodStart, endOfToday),
      this.listBookingsBySource(
        businessId,
        currentPeriodStart,
        endOfToday,
        previousPeriodStart,
        previousPeriodEnd,
      ),
    ]);

    return {
      stats,
      overview,
      todayAppointmentsMetric,
      newLeadsMetric,
      todayAppointments,
      attentionItems: this.buildAttentionItems(stats),
      appointmentsToConfirm,
      recentConversations,
      followUpTasks,
      staffAssignments,
      revenueByCategory,
      bookingsBySource,
    };
  }

  private async getBusinessTimezone(businessId: string): Promise<string> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true },
    });
    return normalizeTimezone(business?.timezone);
  }

  private async getOverview(
    businessId: string,
    now: Date,
    endOfToday: Date,
  ): Promise<DashboardOverviewDto> {
    const waitingClientsToday = await this.prisma.appointment.count({
      where: {
        businessId,
        deletedAt: null,
        startAt: {
          gte: now,
          lte: endOfToday,
        },
        status: {
          in: [AppointmentStatus.UNCONFIRMED, AppointmentStatus.CONFIRMED],
        },
      },
    });

    return {
      waitingClientsToday,
    };
  }

  private async getTodayAppointmentsMetric(
    businessId: string,
    timezone: string,
    previousSevenDayStart: Date,
    trailingSevenDayStart: Date,
    endOfToday: Date,
  ): Promise<DashboardTrendMetricDto> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        businessId,
        deletedAt: null,
        startAt: {
          gte: previousSevenDayStart,
          lte: endOfToday,
        },
        status: {
          in: [
            AppointmentStatus.UNCONFIRMED,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.COMPLETED,
          ],
        },
      },
      select: {
        startAt: true,
      },
      orderBy: {
        startAt: 'asc',
      },
    });

    const allPoints = this.buildDailyPoints(
      rows.map((row) => row.startAt),
      timezone,
      14,
    );
    const points = allPoints.slice(-7);
    const value = allPoints.at(-1) ?? 0;
    const previousValue = allPoints.at(-8) ?? 0;

    return {
      value,
      deltaPercent: this.calculateDeltaPercent(value, previousValue),
      points,
    };
  }

  private async getNewLeadsMetric(
    businessId: string,
    timezone: string,
    trailingSevenDayStart: Date,
    previousSevenDayStart: Date,
    previousSevenDayEnd: Date,
    endOfToday: Date,
  ): Promise<DashboardTrendMetricDto> {
    const rows = await this.prisma.lead.findMany({
      where: {
        businessId,
        deletedAt: null,
        createdAt: {
          gte: previousSevenDayStart,
          lte: endOfToday,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const currentRows = rows.filter(
      (row) => row.createdAt >= trailingSevenDayStart,
    );
    const previousRows = rows.filter(
      (row) =>
        row.createdAt >= previousSevenDayStart &&
        row.createdAt <= previousSevenDayEnd,
    );

    return {
      value: currentRows.length,
      deltaPercent: this.calculateDeltaPercent(
        currentRows.length,
        previousRows.length,
      ),
      points: this.buildDailyPoints(
        currentRows.map((row) => row.createdAt),
        timezone,
        7,
      ),
    };
  }

  private async listTodayAppointments(
    businessId: string,
    startOfToday: Date,
    endOfToday: Date,
  ): Promise<DashboardFeedAppointmentDto[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        businessId,
        deletedAt: null,
        startAt: { gte: startOfToday, lte: endOfToday },
        status: {
          in: [
            AppointmentStatus.UNCONFIRMED,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.COMPLETED,
          ],
        },
      },
      orderBy: { startAt: 'asc' },
      take: 12,
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        status: true,
        source: true,
        notes: true,
        service: {
          select: {
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
      status: row.status,
      source: row.source,
      notes: row.notes,
      serviceName: row.service?.name ?? null,
      assignedTo: this.toStaffSummary(row.assignedTo),
      contact: row.contact,
    }));
  }

  private async listAppointmentsToConfirm(
    businessId: string,
    now: Date,
    confirmWindowEnd: Date,
  ): Promise<DashboardFeedAppointmentDto[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        businessId,
        deletedAt: null,
        status: AppointmentStatus.UNCONFIRMED,
        startAt: {
          gte: now,
          lte: confirmWindowEnd,
        },
      },
      orderBy: { startAt: 'asc' },
      take: 4,
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        status: true,
        source: true,
        notes: true,
        service: {
          select: {
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
      status: row.status,
      source: row.source,
      notes: row.notes,
      serviceName: row.service?.name ?? null,
      assignedTo: this.toStaffSummary(row.assignedTo),
      contact: row.contact,
    }));
  }

  private async listRecentConversations(
    businessId: string,
    since: Date,
  ): Promise<DashboardRecentConversationDto[]> {
    const rows = await this.prisma.conversation.findMany({
      where: {
        businessId,
        deletedAt: null,
        status: {
          in: [ConversationStatus.OPEN, ConversationStatus.PENDING],
        },
        lastMessageAt: {
          gte: since,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 4,
      select: {
        id: true,
        channel: true,
        lastMessagePreview: true,
        lastMessageAt: true,
        unreadCount: true,
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
          },
        },
      },
    });

    return rows
      .filter(
        (row): row is typeof row & { lastMessageAt: Date } =>
          row.lastMessageAt instanceof Date,
      )
      .map((row) => ({
        id: row.id,
        channel: row.channel,
        preview: row.lastMessagePreview,
        lastMessageAt: row.lastMessageAt.toISOString(),
        unreadCount: row.unreadCount,
        href: '/business/conversations',
        contact: row.contact,
      }));
  }

  private async listFollowUpTasks(
    businessId: string,
    startOfToday: Date,
    endOfToday: Date,
  ): Promise<DashboardTaskItemDto[]> {
    const [overdueInvoices, unreadConversations, lowStockProducts, dueTasks] =
      await Promise.all([
        this.prisma.invoice.aggregate({
          where: buildOverdueInvoiceWhere(businessId, startOfToday),
          _count: { _all: true },
        }),
        this.prisma.conversation.count({
          where: {
            businessId,
            deletedAt: null,
            unreadCount: { gt: 0 },
          },
        }),
        this.countLowStockProducts(businessId),
        this.prisma.task.findMany({
          where: {
            businessId,
            deletedAt: null,
            assignedToId: null,
            dueAt: { lte: endOfToday },
            status: {
              in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
            },
          },
          orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
          take: 4,
          select: {
            id: true,
            title: true,
            dueAt: true,
            priority: true,
            assignedTo: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
      ]);

    const items: DashboardTaskItemDto[] = [];

    if (overdueInvoices._count._all > 0) {
      items.push({
        id: 'follow-up-overdue-invoices',
        title: `${overdueInvoices._count._all} overdue invoices need attention`,
        dueAt: endOfToday.toISOString(),
        priority: null,
        assignedTo: null,
      });
    }

    if (unreadConversations > 0) {
      items.push({
        id: 'follow-up-unread-conversations',
        title: `${unreadConversations} unread conversations need replies`,
        dueAt: endOfToday.toISOString(),
        priority: null,
        assignedTo: null,
      });
    }

    if (lowStockProducts > 0) {
      items.push({
        id: 'follow-up-low-stock',
        title: `${lowStockProducts} products need reordering`,
        dueAt: endOfToday.toISOString(),
        priority: null,
        assignedTo: null,
      });
    }

    for (const row of dueTasks) {
      if (items.length >= 4) {
        break;
      }

      items.push({
        id: row.id,
        title: row.title,
        dueAt: row.dueAt.toISOString(),
        priority: row.priority,
        assignedTo: this.toStaffSummary(row.assignedTo),
      });
    }

    return items.slice(0, 4);
  }

  private async listStaffAssignments(
    businessId: string,
    endOfToday: Date,
  ): Promise<DashboardTaskItemDto[]> {
    const rows = await this.prisma.task.findMany({
      where: {
        businessId,
        deletedAt: null,
        assignedToId: { not: null },
        dueAt: { lte: endOfToday },
        status: {
          in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS],
        },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'asc' }],
      take: 4,
      select: {
        id: true,
        title: true,
        dueAt: true,
        priority: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      dueAt: row.dueAt.toISOString(),
      priority: row.priority,
      assignedTo: this.toStaffSummary(row.assignedTo),
    }));
  }

  private async listRevenueByCategory(
    businessId: string,
    start: Date,
    end: Date,
  ): Promise<DashboardRevenueCategoryDto[]> {
    const rows = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: {
          businessId,
          deletedAt: null,
          issueDate: {
            gte: start,
            lte: end,
          },
          status: {
            notIn: [InvoiceStatus.DRAFT, InvoiceStatus.VOID],
          },
        },
      },
      select: {
        title: true,
        totalPrice: true,
        service: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        product: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const totals = new Map<string, { label: string; amount: number }>();
    for (const row of rows) {
      const category = row.service?.category ??
        row.product?.category ?? {
          id: 'other',
          name: row.title || 'Other',
        };
      const current = totals.get(category.id) ?? {
        label: category.name,
        amount: 0,
      };
      current.amount += Number(row.totalPrice?.toString() ?? '0');
      totals.set(category.id, current);
    }

    const sorted = [...totals.entries()]
      .map(([id, value]) => ({
        id,
        ...value,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    const totalAmount = sorted.reduce((sum, item) => sum + item.amount, 0);

    return sorted.map((item) => ({
      id: item.id,
      label: item.label,
      amount: this.decimalString(item.amount),
      sharePercent:
        totalAmount > 0
          ? Number(((item.amount / totalAmount) * 100).toFixed(1))
          : 0,
    }));
  }

  private async listBookingsBySource(
    businessId: string,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date,
  ): Promise<DashboardBookingSourceDto[]> {
    const [currentRows, previousRows] = await Promise.all([
      this.prisma.appointment.groupBy({
        by: ['source'],
        where: {
          businessId,
          deletedAt: null,
          createdAt: {
            gte: currentStart,
            lte: currentEnd,
          },
        },
        _count: { _all: true },
      }),
      this.prisma.appointment.groupBy({
        by: ['source'],
        where: {
          businessId,
          deletedAt: null,
          createdAt: {
            gte: previousStart,
            lte: previousEnd,
          },
        },
        _count: { _all: true },
      }),
    ]);

    const previousMap = new Map<AppointmentSource, number>(
      previousRows.map((row) => [row.source, row._count._all]),
    );

    return currentRows
      .map((row) => {
        const previousCount = previousMap.get(row.source) ?? 0;
        const currentCount = row._count._all;
        return {
          source: row.source,
          label: this.bookingSourceLabel(row.source),
          count: currentCount,
          deltaPercent:
            previousCount > 0
              ? Number(
                  (
                    ((currentCount - previousCount) / previousCount) *
                    100
                  ).toFixed(1),
                )
              : currentCount > 0
                ? 100
                : 0,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }

  private buildAttentionItems(
    stats: BusinessDashboardStatsDto,
  ): DashboardAttentionItemDto[] {
    const items: DashboardAttentionItemDto[] = [];

    if (stats.attention.overdueInvoices > 0) {
      items.push({
        id: 'overdue-invoices',
        title: `${stats.attention.overdueInvoices} overdue invoices`,
        description: `$${stats.attention.overdueInvoiceBalance} outstanding`,
        href: '/business/payments',
      });
    }

    if (stats.attention.lowStockProducts > 0) {
      items.push({
        id: 'low-stock-products',
        title: `${stats.attention.lowStockProducts} products low on stock`,
        href: '/business/products',
      });
    }

    if (stats.attention.unreadConversations > 0) {
      items.push({
        id: 'unread-conversations',
        title: `${stats.attention.unreadConversations} unread conversations`,
        href: '/business/conversations',
      });
    }

    if (stats.appointmentStats.upcoming > 0) {
      items.push({
        id: 'upcoming-appointments',
        title: `${stats.appointmentStats.upcoming} upcoming appointments`,
        description: `${stats.appointmentStats.today} scheduled today`,
        href: '/business/appointments',
      });
    }

    if (stats.workItems.pending > 0) {
      items.push({
        id: 'work-items',
        title: `${stats.workItems.pending} work items in progress`,
        description: `${stats.workItems.scheduled} scheduled`,
        href: '/business/work-items',
      });
    }

    if (stats.leads.active > 0) {
      items.push({
        id: 'pipeline-leads',
        title: `${stats.leads.active} active leads in pipeline`,
        href: '/business/pipelines',
      });
    }

    return items.slice(0, 6);
  }

  private toStaffSummary(
    user:
      | {
          id: string;
          firstName: string | null;
          lastName: string | null;
        }
      | null
      | undefined,
  ) {
    if (!user) {
      return null;
    }

    const displayName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ');
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: displayName || null,
    };
  }

  private bookingSourceLabel(source: AppointmentSource): string {
    switch (source) {
      case AppointmentSource.BOOKING_WIDGET:
        return 'Booking widget';
      case AppointmentSource.PUBLIC_LINK:
        return 'Public link';
      case AppointmentSource.GOOGLE_SYNC:
        return 'Google sync';
      case AppointmentSource.IMPORTED:
        return 'Imported';
      case AppointmentSource.INTERNAL:
      default:
        return 'Front desk';
    }
  }

  private decimalString(
    value: Prisma.Decimal | number | null | undefined,
  ): string {
    if (value === null || value === undefined) {
      return '0.00';
    }

    if (typeof value === 'number') {
      return value.toFixed(2);
    }

    return value.toFixed(2);
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

    return Number(rows[0]?.count ?? 0n);
  }

  private buildDailyPoints(
    values: Date[],
    timezone: string,
    days: number,
  ): number[] {
    const end = DateTime.now().setZone(timezone).startOf('day');
    const counts = new Map<string, number>();

    for (const value of values) {
      const key = DateTime.fromJSDate(value).setZone(timezone).toISODate();
      if (!key) {
        continue;
      }
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from({ length: days }, (_, index) => {
      const key = end.minus({ days: days - 1 - index }).toISODate();
      return key ? (counts.get(key) ?? 0) : 0;
    });
  }

  private calculateDeltaPercent(current: number, previous: number): number {
    if (previous <= 0) {
      return current > 0 ? 100 : 0;
    }

    return Number((((current - previous) / previous) * 100).toFixed(1));
  }
}
