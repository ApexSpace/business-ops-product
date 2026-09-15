import { Injectable } from '@nestjs/common';
import {
  InvoiceLineType,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';
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
  asBoolean,
  asStringArray,
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
  invoiceIds: Set<string>;
  staffIds: Set<string>;
  serviceQty: number;
  serviceSales: number;
  productQty: number;
  productSales: number;
  taxes: number;
  tips: number;
  refunds: number;
};

/** Stacked labels (intentional line breaks) — Mangomint-style, no mid-word wrap. */
const COLUMNS: ReportColumn[] = [
  { key: 'date', label: 'Date', format: 'text', align: 'left' },
  { key: 'salesCount', label: '#\nSales', format: 'int' },
  { key: 'serviceQty', label: '#\nServices', format: 'int' },
  { key: 'serviceSales', label: 'Service\nSales', format: 'money' },
  { key: 'productQty', label: '#\nProducts', format: 'int' },
  { key: 'productSales', label: 'Product\nSales', format: 'money' },
  { key: 'subtotal', label: 'Subtotal', format: 'money' },
  { key: 'taxes', label: 'Taxes', format: 'money' },
  { key: 'tips', label: 'Tips', format: 'money' },
  { key: 'grossTotal', label: 'Gross\nTotal', format: 'money' },
  { key: 'refunds', label: 'Refunds', format: 'money' },
  { key: 'adjustedTotal', label: 'Adjusted\nTotal', format: 'money' },
];

const FOOTNOTES = [
  'The service sales include the value of applied packages.',
  'The adjusted total is the gross total of sales minus any refunds issued within the specified time period.',
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function emptyDay(): DayAgg {
  return {
    invoiceIds: new Set(),
    staffIds: new Set(),
    serviceQty: 0,
    serviceSales: 0,
    productQty: 0,
    productSales: 0,
    taxes: 0,
    tips: 0,
    refunds: 0,
  };
}

function tipFromMetadata(metadata: unknown): number {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return 0;
  }
  const tip = (metadata as Record<string, unknown>).tipAmount;
  return moneyNumber(tip);
}

function formatDateLabel(dayKey: string, timezone: string): string {
  return DateTime.fromISO(dayKey, { zone: timezone || 'UTC' }).toFormat(
    'LLL d',
  );
}

function staffDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
}): string {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Staff'
  );
}

/** Max 2 names, then "+n more". */
export function formatStaffNamesList(names: string[]): string {
  const unique = [...new Set(names.filter(Boolean))];
  if (unique.length === 0) return '—';
  if (unique.length <= 2) return unique.join(', ');
  return `${unique[0]}, ${unique[1]} +${unique.length - 2} more`;
}

@Injectable()
export class SalesSummaryProvider implements ReportDataProvider {
  readonly key = 'sales_summary';

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';
    const onlyStaff = asBoolean(filters.onlySpecificStaff);
    const staffIds = asStringArray(filters.staffIds);
    const staffFilterActive = onlyStaff && staffIds.length > 0;

    const invoiceWhere: Prisma.InvoiceWhereInput = {
      businessId,
      deletedAt: null,
      OR: [
        { closedAt: { gte: range.start, lte: range.end } },
        {
          closedAt: null,
          status: { in: [InvoiceStatus.PAID, InvoiceStatus.PARTIAL] },
          issueDate: { gte: range.start, lte: range.end },
        },
      ],
    };

    const [invoices, refunds] = await Promise.all([
      this.prisma.invoice.findMany({
        where: invoiceWhere,
        select: {
          id: true,
          closedAt: true,
          issueDate: true,
          taxAmount: true,
          metadata: true,
          items: {
            select: {
              lineType: true,
              quantity: true,
              totalPrice: true,
              staffUserId: true,
            },
          },
        },
      }),
      this.prisma.payment.findMany({
        where: refundedPaymentWhere(businessId, {
          start: range.start,
          end: range.end,
        }),
        select: {
          amount: true,
          status: true,
          stripeRefundId: true,
          providerMetadata: true,
          updatedAt: true,
          invoiceId: true,
          invoice: {
            select: {
              items: {
                select: { staffUserId: true, lineType: true },
              },
            },
          },
        },
      }),
    ]);

    const byDay = new Map<string, DayAgg>();

    for (const inv of invoices) {
      const saleDate = inv.closedAt ?? inv.issueDate;
      const dayKey = DateTime.fromJSDate(saleDate, { zone: 'utc' })
        .setZone(timezone)
        .toFormat('yyyy-MM-dd');

      const matchingItems = inv.items.filter((item) => {
        if (
          item.lineType !== InvoiceLineType.SERVICE &&
          item.lineType !== InvoiceLineType.PRODUCT
        ) {
          return false;
        }
        if (!staffFilterActive) return true;
        return !!item.staffUserId && staffIds.includes(item.staffUserId);
      });

      if (matchingItems.length === 0) continue;

      const agg = byDay.get(dayKey) ?? emptyDay();
      agg.invoiceIds.add(inv.id);

      let matchedSales = 0;
      let invoiceServiceProductSales = 0;
      for (const item of inv.items) {
        if (
          item.lineType !== InvoiceLineType.SERVICE &&
          item.lineType !== InvoiceLineType.PRODUCT
        ) {
          continue;
        }
        invoiceServiceProductSales += moneyNumber(item.totalPrice);
      }

      for (const item of matchingItems) {
        const qty = moneyNumber(item.quantity);
        const sales = moneyNumber(item.totalPrice);
        matchedSales += sales;
        if (item.staffUserId) {
          agg.staffIds.add(item.staffUserId);
        }
        if (item.lineType === InvoiceLineType.SERVICE) {
          agg.serviceQty += qty;
          agg.serviceSales += sales;
        } else {
          agg.productQty += qty;
          agg.productSales += sales;
        }
      }

      const share =
        staffFilterActive && invoiceServiceProductSales > 0
          ? matchedSales / invoiceServiceProductSales
          : 1;
      agg.taxes += moneyNumber(inv.taxAmount) * share;
      agg.tips += tipFromMetadata(inv.metadata) * share;
      byDay.set(dayKey, agg);
    }

    for (const payment of refunds) {
      if (!isRefundedPayment(payment)) continue;

      if (staffFilterActive) {
        const hasStaff = (payment.invoice?.items ?? []).some(
          (item) =>
            item.staffUserId &&
            staffIds.includes(item.staffUserId) &&
            (item.lineType === InvoiceLineType.SERVICE ||
              item.lineType === InvoiceLineType.PRODUCT),
        );
        if (!hasStaff) continue;
      }

      const refundedAt = refundTimestamp(payment);
      if (refundedAt < range.start || refundedAt > range.end) continue;

      const dayKey = DateTime.fromJSDate(refundedAt, { zone: 'utc' })
        .setZone(timezone)
        .toFormat('yyyy-MM-dd');
      const agg = byDay.get(dayKey) ?? emptyDay();
      agg.refunds += refundAmountValue(payment);
      byDay.set(dayKey, agg);
    }

    const staffNameById = await this.loadStaffNames(
      staffFilterActive ? staffIds : [],
    );

    const staffAboveTable = staffFilterActive
      ? formatStaffNamesList(
          staffIds.map((id) => staffNameById.get(id) ?? 'Staff'),
        )
      : null;

    const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));

    const totals = emptyDay();
    let totalSalesCount = 0;

    const rows: ReportRow[] = days.map(([dayKey, agg]) => {
      const salesCount = agg.invoiceIds.size;
      const subtotal = agg.serviceSales + agg.productSales;
      const grossTotal = subtotal + agg.taxes + agg.tips;
      const adjustedTotal = grossTotal - agg.refunds;

      totalSalesCount += salesCount;
      totals.serviceQty += agg.serviceQty;
      totals.serviceSales += agg.serviceSales;
      totals.productQty += agg.productQty;
      totals.productSales += agg.productSales;
      totals.taxes += agg.taxes;
      totals.tips += agg.tips;
      totals.refunds += agg.refunds;

      return row(dayKey, {
        date: formatDateLabel(dayKey, timezone),
        salesCount,
        serviceQty: round2(agg.serviceQty),
        serviceSales: round2(agg.serviceSales),
        productQty: round2(agg.productQty),
        productSales: round2(agg.productSales),
        subtotal: round2(subtotal),
        taxes: round2(agg.taxes),
        tips: round2(agg.tips),
        grossTotal: round2(grossTotal),
        refunds: round2(agg.refunds),
        adjustedTotal: round2(adjustedTotal),
      });
    });

    const totalSubtotal = totals.serviceSales + totals.productSales;
    const totalGross = totalSubtotal + totals.taxes + totals.tips;
    const totalAdjusted = totalGross - totals.refunds;

    rows.push(
      row(
        'total',
        {
          date: 'Total',
          salesCount: totalSalesCount,
          serviceQty: round2(totals.serviceQty),
          serviceSales: round2(totals.serviceSales),
          productQty: round2(totals.productQty),
          productSales: round2(totals.productSales),
          subtotal: round2(totalSubtotal),
          taxes: round2(totals.taxes),
          tips: round2(totals.tips),
          grossTotal: round2(totalGross),
          refunds: round2(totals.refunds),
          adjustedTotal: round2(totalAdjusted),
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Sales Summary',
        description:
          'Shows the quantities and sales totals of services and products for each day.',
        periodLabel: range.periodLabel,
        context,
        footnotes: FOOTNOTES,
      }),
      [
        section('sales', COLUMNS, rows, {
          subtitle:
            staffAboveTable && staffAboveTable !== '—'
              ? `Staff: ${staffAboveTable}`
              : undefined,
        }),
      ],
    );
  }

  private async loadStaffNames(
    staffIds: string[],
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (staffIds.length === 0) return map;
    const users = await this.prisma.user.findMany({
      where: { id: { in: staffIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    for (const user of users) {
      map.set(user.id, staffDisplayName(user));
    }
    return map;
  }
}
