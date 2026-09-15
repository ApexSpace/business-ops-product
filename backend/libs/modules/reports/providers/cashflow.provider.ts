import { Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '@app/core/database/prisma.service';
import type {
  ReportColumn,
  ReportDocument,
  ReportFilters,
  ReportRow,
} from '../contracts/report-document';
import type {
  ReportDataProvider,
  ReportGenerateContext,
} from '../contracts/report-provider.interface';
import {
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

/** Cash-equivalent methods (excludes gift cards, wallet/packages). */
const CASH_EQUIVALENT: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CARD,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.STRIPE,
  PaymentMethod.OTHER,
];

const COLUMNS: ReportColumn[] = [
  { key: 'date', label: 'Date', format: 'text', align: 'left' },
  {
    key: 'incoming',
    label: 'Incoming Cashflow',
    format: 'money',
    align: 'right',
  },
  {
    key: 'staffTips',
    label: 'Staff Tips',
    format: 'money',
    align: 'right',
  },
  {
    key: 'netCashflow',
    label: 'Net Cashflow',
    format: 'money',
    align: 'right',
  },
];

const DESCRIPTION =
  'Shows gross and net totals for cashflow. Includes all cash-equivalent forms of payment and ignores non-cash payments like gift cards, packages, etc.';

const FOOTNOTES = [
  'Incoming cashflow includes all cash and card payments.',
];

type DayAgg = {
  incoming: number;
  staffTips: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function tipFromMetadata(metadata: unknown): number {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return 0;
  }
  return moneyNumber((metadata as Record<string, unknown>).tipAmount);
}

function dayKeyFromDate(date: Date, timezone: string): string {
  return DateTime.fromJSDate(date, { zone: 'utc' })
    .setZone(timezone || 'UTC')
    .toFormat('yyyy-MM-dd');
}

function formatDayLabel(dayKey: string, timezone: string): string {
  return DateTime.fromISO(dayKey, { zone: timezone || 'UTC' }).toFormat(
    'LLL d',
  );
}

/**
 * Cashflow (Mangomint parity).
 *
 * Daily rows by payment date:
 * - Incoming = cash-equivalent payments (− cash-equivalent refunds)
 * - Staff Tips = tipAmount from the sale, allocated across that sale’s
 *   cash-equivalent payments (payment-date weighted)
 * - Net = Incoming − Staff Tips
 */
@Injectable()
export class CashflowProvider implements ReportDataProvider {
  readonly key = 'cashflow';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';

    const [payments, refundPayments] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          businessId,
          deletedAt: null,
          method: { in: CASH_EQUIVALENT },
          status: PaymentStatus.SUCCEEDED,
          OR: [
            { paidAt: { gte: range.start, lte: range.end } },
            {
              paidAt: null,
              createdAt: { gte: range.start, lte: range.end },
            },
          ],
        },
        select: {
          id: true,
          amount: true,
          paidAt: true,
          createdAt: true,
          invoiceId: true,
          invoice: {
            select: {
              id: true,
              metadata: true,
            },
          },
        },
        orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
        take: 10000,
      }),
      this.prisma.payment.findMany({
        where: {
          ...refundedPaymentWhere(businessId, {
            start: range.start,
            end: range.end,
          }),
          method: { in: CASH_EQUIVALENT },
        },
        select: {
          amount: true,
          status: true,
          stripeRefundId: true,
          providerMetadata: true,
          updatedAt: true,
        },
        take: 5000,
      }),
    ]);

    const invoiceIds = [
      ...new Set(payments.map((p) => p.invoiceId).filter(Boolean)),
    ];

    // All cash-equivalent payments on those invoices (for tip allocation base).
    const invoiceCashTotals = new Map<string, number>();
    if (invoiceIds.length > 0) {
      const allCashOnInvoices = await this.prisma.payment.findMany({
        where: {
          businessId,
          deletedAt: null,
          invoiceId: { in: invoiceIds },
          method: { in: CASH_EQUIVALENT },
          status: {
            in: [PaymentStatus.SUCCEEDED, PaymentStatus.REFUNDED],
          },
        },
        select: { invoiceId: true, amount: true },
      });
      for (const payment of allCashOnInvoices) {
        invoiceCashTotals.set(
          payment.invoiceId,
          (invoiceCashTotals.get(payment.invoiceId) ?? 0) +
            moneyNumber(payment.amount),
        );
      }
    }

    const byDay = new Map<string, DayAgg>();

    function dayAgg(dayKey: string): DayAgg {
      const existing = byDay.get(dayKey);
      if (existing) return existing;
      const created: DayAgg = { incoming: 0, staffTips: 0 };
      byDay.set(dayKey, created);
      return created;
    }

    for (const payment of payments) {
      const occurredAt = payment.paidAt ?? payment.createdAt;
      const dayKey = dayKeyFromDate(occurredAt, timezone);
      const amount = moneyNumber(payment.amount);
      const agg = dayAgg(dayKey);
      agg.incoming += amount;

      const invoiceTip = tipFromMetadata(payment.invoice?.metadata);
      if (invoiceTip > 0) {
        const cashBase = invoiceCashTotals.get(payment.invoiceId) ?? 0;
        if (cashBase > 0.005) {
          agg.staffTips += invoiceTip * (amount / cashBase);
        }
      }
    }

    for (const payment of refundPayments) {
      if (!isRefundedPayment(payment)) continue;
      const refundedAt = refundTimestamp(payment);
      if (refundedAt < range.start || refundedAt > range.end) continue;
      const dayKey = dayKeyFromDate(refundedAt, timezone);
      const agg = dayAgg(dayKey);
      agg.incoming -= refundAmountValue(payment);
    }

    const days = [...byDay.keys()].sort((a, b) => a.localeCompare(b));
    const rows: ReportRow[] = [];
    let totalIncoming = 0;
    let totalTips = 0;

    for (const dayKey of days) {
      const agg = byDay.get(dayKey)!;
      const incoming = round2(agg.incoming);
      const staffTips = round2(agg.staffTips);
      const netCashflow = round2(incoming - staffTips);
      totalIncoming += incoming;
      totalTips += staffTips;
      rows.push(
        row(dayKey, {
          date: formatDayLabel(dayKey, timezone),
          incoming,
          staffTips,
          netCashflow,
        }),
      );
    }

    rows.push(
      row(
        'total',
        {
          date: 'Total',
          incoming: round2(totalIncoming),
          staffTips: round2(totalTips),
          netCashflow: round2(totalIncoming - totalTips),
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Cashflow',
        description: DESCRIPTION,
        periodLabel: range.periodLabel,
        context,
        footnotes: FOOTNOTES,
      }),
      [section('cashflow', COLUMNS, rows)],
    );
  }
}
