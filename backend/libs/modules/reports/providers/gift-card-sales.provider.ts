import { Injectable } from '@nestjs/common';
import {
  GiftCardSource,
  InvoiceLineType,
  InvoiceStatus,
} from '@prisma/client';
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

type DayAgg = {
  giftCardCount: number;
  adjustments: number;
  sales: number;
};

type RefundAgg = {
  refundCount: number;
  refundAmount: number;
};

const SALES_COLUMNS: ReportColumn[] = [
  { key: 'giftCardCount', label: '# Gift Cards', format: 'int', align: 'right' },
  { key: 'adjustments', label: 'Adjustments', format: 'money', align: 'right' },
  { key: 'sales', label: 'Sales', format: 'money', align: 'right' },
];

const REFUND_COLUMNS: ReportColumn[] = [
  { key: 'refundCount', label: '# Refunds', format: 'int', align: 'right' },
  { key: 'refunds', label: 'Refunds', format: 'money', align: 'right' },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function emptyDay(): DayAgg {
  return { giftCardCount: 0, adjustments: 0, sales: 0 };
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

function parseItemMeta(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function saleDateFromInvoice(invoice: {
  closedAt: Date | null;
  issueDate: Date;
}): Date {
  return invoice.closedAt ?? invoice.issueDate;
}

function accumulateSale(
  agg: DayAgg,
  params: { count: number; adjustments: number; sales: number },
): void {
  agg.giftCardCount += params.count;
  agg.adjustments += params.adjustments;
  agg.sales += params.sales;
}

function buildSalesRows(agg: DayAgg): ReportRow[] {
  return [
    row('sales-summary', {
      giftCardCount: round2(agg.giftCardCount),
      adjustments: round2(agg.adjustments),
      sales: round2(agg.sales),
    }),
  ];
}

function buildRefundRows(agg: RefundAgg): ReportRow[] {
  return [
    row('refunds-summary', {
      refundCount: round2(agg.refundCount),
      refunds: round2(agg.refundAmount),
    }),
  ];
}

@Injectable()
export class GiftCardSalesProvider implements ReportDataProvider {
  readonly key = 'gift_card_sales';
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

    const overall = emptyDay();
    const byDay = new Map<string, DayAgg>();

    // POS gift card sales: closed invoices with gift-card line items.
    const invoices = await this.prisma.invoice.findMany({
      where: {
        businessId,
        deletedAt: null,
        items: { some: { lineType: InvoiceLineType.GIFT_CARD } },
        OR: [
          { closedAt: { gte: range.start, lte: range.end } },
          {
            closedAt: null,
            status: { in: [InvoiceStatus.PAID, InvoiceStatus.PARTIAL] },
            issueDate: { gte: range.start, lte: range.end },
          },
        ],
      },
      select: {
        id: true,
        closedAt: true,
        issueDate: true,
        items: {
          where: { lineType: InvoiceLineType.GIFT_CARD },
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            metadata: true,
          },
        },
      },
      take: 5000,
    });

    const invoiceIdsWithGiftSales = new Set<string>();

    for (const invoice of invoices) {
      const saleDate = saleDateFromInvoice(invoice);
      const day = dayKeyFromDate(saleDate, timezone);
      const dayAgg = byDay.get(day) ?? emptyDay();

      for (const item of invoice.items) {
        const qty = Math.max(1, moneyNumber(item.quantity));
        const sales = moneyNumber(item.totalPrice);
        const meta = parseItemMeta(item.metadata);
        const cardValue =
          meta.cardValue != null
            ? moneyNumber(meta.cardValue)
            : moneyNumber(item.unitPrice);
        // Mangomint: adjustments made to the default price during checkout.
        const adjustments = Math.max(0, cardValue * qty - sales);

        accumulateSale(overall, { count: qty, adjustments, sales });
        accumulateSale(dayAgg, { count: qty, adjustments, sales });
      }

      invoiceIdsWithGiftSales.add(invoice.id);
      byDay.set(day, dayAgg);
    }

    // Online purchases may not be linked to a closed POS invoice.
    const onlineCards = await this.prisma.giftCard.findMany({
      where: {
        businessId,
        source: GiftCardSource.ONLINE_PURCHASE,
        createdAt: { gte: range.start, lte: range.end },
        OR: [{ invoiceId: null }, { invoiceId: { notIn: [...invoiceIdsWithGiftSales] } }],
      },
      include: {
        promotion: { select: { salePrice: true, cardValue: true } },
      },
      take: 5000,
    });

    for (const card of onlineCards) {
      const day = dayKeyFromDate(card.createdAt, timezone);
      const dayAgg = byDay.get(day) ?? emptyDay();
      const cardValue = moneyNumber(
        card.promotion?.cardValue ?? card.initialValue,
      );
      const sales = moneyNumber(
        card.promotion?.salePrice ?? card.initialValue,
      );
      const adjustments = Math.max(0, cardValue - sales);

      accumulateSale(overall, { count: 1, adjustments, sales });
      accumulateSale(dayAgg, { count: 1, adjustments, sales });
      byDay.set(day, dayAgg);
    }

    const refunds = await this.loadGiftCardSaleRefunds({
      businessId,
      rangeStart: range.start,
      rangeEnd: range.end,
      filterRefundsBy,
    });

    const sections: ReportSection[] = [
      section('sales', SALES_COLUMNS, buildSalesRows(overall)),
      section('refunds', REFUND_COLUMNS, buildRefundRows(refunds), {
        title: 'Refunds',
      }),
    ];

    if (includeDaily) {
      const days = [...byDay.keys()].sort((a, b) => a.localeCompare(b));
      days.forEach((day, index) => {
        sections.push(
          section(
            `day-${day}`,
            SALES_COLUMNS,
            buildSalesRows(byDay.get(day)!),
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
        title: 'Gift Card Sales',
        description: 'Shows the quantities and sales totals of gift cards.',
        periodLabel: range.periodLabel,
        context,
      }),
      sections,
    );
  }

  private async loadGiftCardSaleRefunds(params: {
    businessId: string;
    rangeStart: Date;
    rangeEnd: Date;
    filterRefundsBy: string;
  }): Promise<RefundAgg> {
    const payments = await this.prisma.payment.findMany({
      where: {
        ...(params.filterRefundsBy === 'refund_date'
          ? refundedPaymentWhere(params.businessId, {
              start: params.rangeStart,
              end: params.rangeEnd,
            })
          : refundedPaymentWhere(params.businessId)),
        invoice: {
          deletedAt: null,
          items: { some: { lineType: InvoiceLineType.GIFT_CARD } },
        },
      },
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
            items: {
              select: {
                lineType: true,
                totalPrice: true,
              },
            },
          },
        },
      },
      take: 5000,
    });

    const agg: RefundAgg = { refundCount: 0, refundAmount: 0 };

    for (const payment of payments) {
      if (!isRefundedPayment(payment) || !payment.invoice) continue;

      const saleDate = saleDateFromInvoice(payment.invoice);
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

      const giftSales = payment.invoice.items
        .filter((item) => item.lineType === InvoiceLineType.GIFT_CARD)
        .reduce((sum, item) => sum + moneyNumber(item.totalPrice), 0);
      if (giftSales <= 0) continue;

      const invoiceSubtotal = moneyNumber(payment.invoice.subtotal);
      const share =
        invoiceSubtotal > 0 ? Math.min(1, giftSales / invoiceSubtotal) : 1;
      const refundAmount = round2(refundAmountValue(payment) * share);

      agg.refundCount += 1;
      agg.refundAmount += refundAmount;
    }

    agg.refundAmount = round2(agg.refundAmount);
    return agg;
  }
}
