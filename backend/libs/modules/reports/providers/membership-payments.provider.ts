import { Injectable } from '@nestjs/common';
import { MembershipBillingEventType } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '@app/core/database/prisma.service';
import type {
  ReportColumn,
  ReportDocument,
  ReportFilters,
  ReportRow,
  ReportSection,
} from '../contracts/report-document';
import type {
  ReportDataProvider,
  ReportGenerateContext,
} from '../contracts/report-provider.interface';
import {
  asBoolean,
  asString,
  moneyNumber,
  resolveReportDateRange,
} from '../utils/report-date-range.util';
import {
  buildDocument,
  buildReportMeta,
  row,
  section,
} from '../utils/report-document.builder';
import {
  isRefundedPayment,
  refundAmountValue,
  refundedPaymentWhere,
  refundTimestamp,
} from '../utils/refunded-payments.util';

type PaymentAgg = {
  name: string;
  total: number;
  newCount: number;
  sales: number;
};

type RefundAgg = {
  name: string;
  refundCount: number;
  refundAmount: number;
};

const PAYMENT_EVENT_TYPES: MembershipBillingEventType[] = [
  MembershipBillingEventType.PAYMENT_SUCCEEDED,
  MembershipBillingEventType.SUBSCRIPTION_RENEWED,
];

const PAYMENT_COLUMNS: ReportColumn[] = [
  { key: 'name', label: 'Name', format: 'text', align: 'left' },
  { key: 'total', label: 'Total', format: 'int', align: 'right' },
  { key: 'newCount', label: 'New', format: 'int', align: 'right' },
  { key: 'sales', label: 'Sales', format: 'money', align: 'right' },
];

const REFUND_COLUMNS: ReportColumn[] = [
  { key: 'name', label: 'Name', format: 'text', align: 'left' },
  { key: 'refundCount', label: '# Refunds', format: 'int', align: 'right' },
  { key: 'refunds', label: 'Refunds', format: 'money', align: 'right' },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function dayKeyFromDate(date: Date, timezone: string): string {
  return DateTime.fromJSDate(date, { zone: 'utc' })
    .setZone(timezone || 'UTC')
    .toFormat('yyyy-MM-dd');
}

function formatDayHeading(dayKey: string, timezone: string): string {
  return `FOR ${DateTime.fromISO(dayKey, { zone: timezone || 'UTC' })
    .toFormat('LLL d')
    .toUpperCase()}`;
}

function accumulatePayment(
  map: Map<string, PaymentAgg>,
  params: { name: string; isNew: boolean; sales: number },
): void {
  const key = params.name || 'Membership';
  const agg = map.get(key) ?? {
    name: key,
    total: 0,
    newCount: 0,
    sales: 0,
  };
  agg.total += 1;
  if (params.isNew) agg.newCount += 1;
  agg.sales += params.sales;
  map.set(key, agg);
}

function accumulateRefund(
  map: Map<string, RefundAgg>,
  params: { name: string; refundCount: number; refundAmount: number },
): void {
  const key = params.name || 'Membership';
  const agg = map.get(key) ?? {
    name: key,
    refundCount: 0,
    refundAmount: 0,
  };
  agg.refundCount += params.refundCount;
  agg.refundAmount += params.refundAmount;
  map.set(key, agg);
}

function buildPaymentRows(map: Map<string, PaymentAgg>): ReportRow[] {
  const lines = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  let totalCount = 0;
  let totalNew = 0;
  let totalSales = 0;

  const rows: ReportRow[] = lines.map((line) => {
    totalCount += line.total;
    totalNew += line.newCount;
    totalSales += line.sales;
    return row(`payment-${line.name}`, {
      name: line.name,
      total: round2(line.total),
      newCount: round2(line.newCount),
      sales: round2(line.sales),
    });
  });

  rows.push(
    row(
      'payments-total',
      {
        name: 'Total',
        total: round2(totalCount),
        newCount: round2(totalNew),
        sales: round2(totalSales),
      },
      { isTotal: true },
    ),
  );

  return rows;
}

function buildRefundRows(map: Map<string, RefundAgg>): ReportRow[] {
  const lines = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  let totalCount = 0;
  let totalAmount = 0;

  const rows: ReportRow[] = lines.map((line) => {
    totalCount += line.refundCount;
    totalAmount += line.refundAmount;
    return row(`refund-${line.name}`, {
      name: line.name,
      refundCount: round2(line.refundCount),
      refunds: round2(line.refundAmount),
    });
  });

  rows.push(
    row(
      'refunds-total',
      {
        name: 'Total',
        refundCount: round2(totalCount),
        refunds: round2(totalAmount),
      },
      { isTotal: true },
    ),
  );

  return rows;
}

@Injectable()
export class MembershipPaymentsProvider implements ReportDataProvider {
  readonly key = 'membership_payments';

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';
    const includeDaily = asBoolean(filters.includeDailyDetails);
    const filterRefundsBy = asString(filters.filterRefundsBy, 'sale_date');

    const overall = new Map<string, PaymentAgg>();
    const byDay = new Map<string, Map<string, PaymentAgg>>();

    const events = await this.prisma.membershipBillingEvent.findMany({
      where: {
        eventType: { in: PAYMENT_EVENT_TYPES },
        occurredAt: { gte: range.start, lte: range.end },
        clientMembership: { businessId },
      },
      include: {
        clientMembership: {
          include: {
            plan: { select: { name: true, price: true } },
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: 5000,
    });

    for (const event of events) {
      const name = event.clientMembership.plan.name;
      const sales = round2(
        moneyNumber(
          event.amount ??
            event.clientMembership.price ??
            event.clientMembership.plan.price,
        ),
      );
      const isNew =
        event.eventType === MembershipBillingEventType.PAYMENT_SUCCEEDED;
      const day = dayKeyFromDate(event.occurredAt, timezone);
      const dayMap = byDay.get(day) ?? new Map<string, PaymentAgg>();

      accumulatePayment(overall, { name, isNew, sales });
      accumulatePayment(dayMap, { name, isNew, sales });
      byDay.set(day, dayMap);
    }

    const refundMap = await this.loadMembershipRefunds({
      businessId,
      rangeStart: range.start,
      rangeEnd: range.end,
      filterRefundsBy,
    });

    const sections: ReportSection[] = [
      section(
        'payments',
        PAYMENT_COLUMNS,
        buildPaymentRows(overall),
        { title: '# Membership Payments' },
      ),
      section('refunds', REFUND_COLUMNS, buildRefundRows(refundMap), {
        title: 'Refunds',
      }),
    ];

    if (includeDaily) {
      const days = [...byDay.keys()].sort((a, b) => a.localeCompare(b));
      days.forEach((day, index) => {
        sections.push(
          section(
            `day-${day}`,
            PAYMENT_COLUMNS,
            buildPaymentRows(byDay.get(day)!),
            {
              title: formatDayHeading(day, timezone),
              pageBreakBefore: index === 0,
              pageBreakHeader: 'none',
            },
          ),
        );
      });
    }

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Membership Payments',
        description:
          'Shows payments for new memberships and membership renewals.',
        periodLabel: range.periodLabel,
        context,
      }),
      sections,
    );
  }

  private async loadMembershipRefunds(params: {
    businessId: string;
    rangeStart: Date;
    rangeEnd: Date;
    filterRefundsBy: string;
  }): Promise<Map<string, RefundAgg>> {
    const paymentEvents = await this.prisma.membershipBillingEvent.findMany({
      where: {
        eventType: { in: PAYMENT_EVENT_TYPES },
        clientMembership: { businessId: params.businessId },
        OR: [
          { stripePaymentIntentId: { not: null } },
          { stripeInvoiceId: { not: null } },
        ],
      },
      select: {
        occurredAt: true,
        stripePaymentIntentId: true,
        stripeInvoiceId: true,
        amount: true,
        clientMembership: {
          select: {
            price: true,
            plan: { select: { name: true, price: true } },
          },
        },
      },
      take: 5000,
    });

    const intentIds = paymentEvents
      .map((event) => event.stripePaymentIntentId)
      .filter((id): id is string => Boolean(id));

    if (intentIds.length === 0) {
      return new Map();
    }

    const eventsByIntent = new Map(
      paymentEvents
        .filter((event) => event.stripePaymentIntentId)
        .map((event) => [event.stripePaymentIntentId!, event]),
    );

    const payments = await this.prisma.payment.findMany({
      where: {
        ...(params.filterRefundsBy === 'refund_date'
          ? refundedPaymentWhere(params.businessId, {
              start: params.rangeStart,
              end: params.rangeEnd,
            })
          : refundedPaymentWhere(params.businessId)),
        stripePaymentIntentId: { in: intentIds },
      },
      select: {
        amount: true,
        status: true,
        stripeRefundId: true,
        stripePaymentIntentId: true,
        providerMetadata: true,
        updatedAt: true,
      },
      take: 5000,
    });

    const map = new Map<string, RefundAgg>();

    for (const payment of payments) {
      if (!isRefundedPayment(payment) || !payment.stripePaymentIntentId) {
        continue;
      }

      const billingEvent = eventsByIntent.get(payment.stripePaymentIntentId);
      if (!billingEvent) continue;

      const saleDate = billingEvent.occurredAt;
      const refundedAt = refundTimestamp(payment);

      if (params.filterRefundsBy === 'sale_date') {
        if (saleDate < params.rangeStart || saleDate > params.rangeEnd) {
          continue;
        }
      } else if (
        refundedAt < params.rangeStart ||
        refundedAt > params.rangeEnd
      ) {
        continue;
      }

      const name = billingEvent.clientMembership.plan.name;
      const refundAmount = round2(
        refundAmountValue(payment) ||
          moneyNumber(
            billingEvent.amount ??
              billingEvent.clientMembership.price ??
              billingEvent.clientMembership.plan.price,
          ),
      );

      accumulateRefund(map, {
        name,
        refundCount: 1,
        refundAmount,
      });
    }

    return map;
  }
}
