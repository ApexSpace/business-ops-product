import { Injectable } from '@nestjs/common';
import { InvoiceLineType } from '@prisma/client';
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

type DayAgg = {
  refundItemQty: number;
  subtotal: number;
  taxes: number;
  tips: number;
  total: number;
};

const COLUMNS: ReportColumn[] = [
  { key: 'date', label: 'Date', format: 'text', align: 'left' },
  { key: 'refundCount', label: '# Refunds', format: 'int' },
  { key: 'subtotal', label: 'Subtotal', format: 'money' },
  { key: 'taxes', label: 'Taxes', format: 'money' },
  { key: 'tips', label: 'Tips', format: 'money' },
  { key: 'total', label: 'Total', format: 'money' },
];

const FOOTNOTES = [
  'The quantity of refunds shows how many individual items were refunded, not how many refund transactions there were.',
];

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

function formatDateLabel(dayKey: string, timezone: string): string {
  return DateTime.fromISO(dayKey, { zone: timezone || 'UTC' }).toFormat(
    'LLL d, yyyy',
  );
}

function emptyDay(): DayAgg {
  return {
    refundItemQty: 0,
    subtotal: 0,
    taxes: 0,
    tips: 0,
    total: 0,
  };
}

/** Split a refund amount across subtotal / tax / tip using invoice proportions. */
function allocateRefundParts(params: {
  refundAmount: number;
  invoiceSubtotal: number;
  invoiceTax: number;
  invoiceTips: number;
}): { subtotal: number; taxes: number; tips: number } {
  const { refundAmount, invoiceSubtotal, invoiceTax, invoiceTips } = params;
  const base = invoiceSubtotal + invoiceTax + invoiceTips;
  if (base <= 0 || refundAmount <= 0) {
    return { subtotal: refundAmount, taxes: 0, tips: 0 };
  }
  return {
    subtotal: refundAmount * (invoiceSubtotal / base),
    taxes: refundAmount * (invoiceTax / base),
    tips: refundAmount * (invoiceTips / base),
  };
}

function refundableItemQty(
  items: Array<{ lineType: InvoiceLineType; quantity: unknown }>,
): number {
  let qty = 0;
  for (const item of items) {
    if (
      item.lineType !== InvoiceLineType.SERVICE &&
      item.lineType !== InvoiceLineType.PRODUCT
    ) {
      continue;
    }
    qty += moneyNumber(item.quantity);
  }
  return qty;
}

function buildRows(
  byDay: Map<string, DayAgg>,
  timezone: string,
): ReportRow[] {
  const days = [...byDay.keys()].sort((a, b) => a.localeCompare(b));
  let totalQty = 0;
  let totalSubtotal = 0;
  let totalTaxes = 0;
  let totalTips = 0;
  let totalAmount = 0;

  const rows: ReportRow[] = days.map((day) => {
    const agg = byDay.get(day)!;
    totalQty += agg.refundItemQty;
    totalSubtotal += agg.subtotal;
    totalTaxes += agg.taxes;
    totalTips += agg.tips;
    totalAmount += agg.total;
    return row(`day-${day}`, {
      date: formatDateLabel(day, timezone),
      refundCount: round2(agg.refundItemQty),
      subtotal: round2(agg.subtotal),
      taxes: round2(agg.taxes),
      tips: round2(agg.tips),
      total: round2(agg.total),
    });
  });

  rows.push(
    row(
      'total',
      {
        date: 'Total',
        refundCount: round2(totalQty),
        subtotal: round2(totalSubtotal),
        taxes: round2(totalTaxes),
        tips: round2(totalTips),
        total: round2(totalAmount),
      },
      { isTotal: true },
    ),
  );

  return rows;
}

@Injectable()
export class RefundSummaryProvider implements ReportDataProvider {
  readonly key = 'refund_summary';

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';
    const filterRefundsBy = asString(filters.filterRefundsBy, 'refund_date');
    const filteredByLabel =
      filterRefundsBy === 'sale_date' ? 'Sale Date' : 'Refund Date';

    // Same refund detection as Refund Details (status / stripeRefundId / metadata).
    const payments = await this.prisma.payment.findMany({
      where:
        filterRefundsBy === 'refund_date'
          ? refundedPaymentWhere(businessId, {
              start: range.start,
              end: range.end,
            })
          : refundedPaymentWhere(businessId),
      select: {
        amount: true,
        status: true,
        stripeRefundId: true,
        providerMetadata: true,
        updatedAt: true,
        invoice: {
          select: {
            closedAt: true,
            issueDate: true,
            subtotal: true,
            taxAmount: true,
            metadata: true,
            items: {
              select: {
                lineType: true,
                quantity: true,
              },
            },
          },
        },
      },
      take: 5000,
    });

    const byDay = new Map<string, DayAgg>();

    for (const payment of payments) {
      if (!isRefundedPayment(payment)) continue;

      const invoice = payment.invoice;
      if (!invoice) continue;

      const refundedAt = refundTimestamp(payment);
      const saleDate = invoice.closedAt ?? invoice.issueDate;

      if (filterRefundsBy === 'sale_date') {
        if (saleDate < range.start || saleDate > range.end) {
          continue;
        }
      } else if (refundedAt < range.start || refundedAt > range.end) {
        continue;
      }

      const bucketDate =
        filterRefundsBy === 'sale_date' ? saleDate : refundedAt;
      const day = dayKeyFromDate(bucketDate, timezone);
      const agg = byDay.get(day) ?? emptyDay();

      const refundAmount = refundAmountValue(payment);
      const parts = allocateRefundParts({
        refundAmount,
        invoiceSubtotal: moneyNumber(invoice.subtotal),
        invoiceTax: moneyNumber(invoice.taxAmount),
        invoiceTips: tipFromMetadata(invoice.metadata),
      });

      agg.refundItemQty += refundableItemQty(invoice.items);
      agg.subtotal += parts.subtotal;
      agg.taxes += parts.taxes;
      agg.tips += parts.tips;
      agg.total += refundAmount;
      byDay.set(day, agg);
    }

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Refund Summary',
        description: 'Shows daily totals and quantities of all refund types.',
        periodLabel: range.periodLabel,
        context,
        footnotes: FOOTNOTES,
      }),
      [
        section('total-refunds', COLUMNS, buildRows(byDay, timezone), {
          title: 'Total Refunds',
          subtitle: `Filtered by: ${filteredByLabel}`,
        }),
      ],
    );
  }
}
