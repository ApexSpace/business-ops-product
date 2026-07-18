import { Injectable } from '@nestjs/common';
import { InvoiceLineType } from '@prisma/client';
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
import { loadClosedInvoicesWithItems } from '../utils/closed-invoices.util';
import {
  isRefundedPayment,
  refundAmountValue,
  refundedPaymentWhere,
  refundTimestamp,
} from '../utils/refunded-payments.util';

type GroupByMode = 'brand' | 'category';
type SortByMode = 'total_sales' | 'name' | 'quantity';

type LineAgg = {
  name: string;
  group: string;
  qty: number;
  adjustments: number;
  sales: number;
};

type RefundAgg = {
  name: string;
  group: string;
  refundCount: number;
  returnedCredits: number;
  refundAmount: number;
};

const FOOTNOTES = [
  'The sales amount does not account for any refunds that were issued.',
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function moneyOrDash(n: number): number | null {
  return Math.abs(n) < 0.005 ? null : round2(n);
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

function productColumns(groupBy: GroupByMode): ReportColumn[] {
  const groupLabel = groupBy === 'brand' ? 'Brand' : 'Category';
  return [
    {
      key: 'label',
      label: `${groupLabel}/Product`,
      format: 'text',
      align: 'left',
    },
    { key: 'qty', label: '# Products', format: 'int' },
    { key: 'adjustments', label: 'Adjustments', format: 'money' },
    { key: 'sales', label: 'Sales', format: 'money' },
  ];
}

function refundColumns(groupBy: GroupByMode): ReportColumn[] {
  const groupLabel = groupBy === 'brand' ? 'Brand' : 'Category';
  return [
    {
      key: 'label',
      label: `${groupLabel}/Product`,
      format: 'text',
      align: 'left',
    },
    { key: 'refundCount', label: '# Refunds', format: 'int' },
    { key: 'returnedCredits', label: '# Returned Credits', format: 'int' },
    { key: 'refundAmount', label: 'Refunds', format: 'money' },
  ];
}

function resolveGroupLabel(
  groupBy: GroupByMode,
  product: {
    brand: string | null;
    category: { name: string } | null;
  } | null,
): string {
  if (groupBy === 'brand') {
    const brand = product?.brand?.trim();
    return brand && brand.length > 0 ? brand : 'No Brand';
  }
  return product?.category?.name ?? 'Uncategorized';
}

function accumulateLine(
  map: Map<string, LineAgg>,
  params: {
    id: string;
    name: string;
    group: string;
    qty: number;
    adjustments: number;
    sales: number;
  },
): void {
  const agg =
    map.get(params.id) ??
    ({
      name: params.name,
      group: params.group,
      qty: 0,
      adjustments: 0,
      sales: 0,
    } satisfies LineAgg);
  agg.qty += params.qty;
  agg.adjustments += params.adjustments;
  agg.sales += params.sales;
  map.set(params.id, agg);
}

function sortLines(lines: LineAgg[], sortBy: SortByMode): LineAgg[] {
  const sorted = [...lines];
  if (sortBy === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'quantity') {
    sorted.sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
  } else {
    sorted.sort((a, b) => b.sales - a.sales || a.name.localeCompare(b.name));
  }
  return sorted;
}

function sortGroups(
  entries: Array<[string, LineAgg[]]>,
  sortBy: SortByMode,
): Array<[string, LineAgg[]]> {
  const withTotals = entries.map(([group, lines]) => {
    let qty = 0;
    let sales = 0;
    for (const line of lines) {
      qty += line.qty;
      sales += line.sales;
    }
    return { group, lines, qty, sales };
  });

  if (sortBy === 'name') {
    withTotals.sort((a, b) => a.group.localeCompare(b.group));
  } else if (sortBy === 'quantity') {
    withTotals.sort(
      (a, b) => b.qty - a.qty || a.group.localeCompare(b.group),
    );
  } else {
    withTotals.sort(
      (a, b) => b.sales - a.sales || a.group.localeCompare(b.group),
    );
  }

  return withTotals.map((entry) => [entry.group, entry.lines]);
}

function buildProductRows(
  products: Map<string, LineAgg>,
  sortBy: SortByMode,
): ReportRow[] {
  if (products.size === 0) {
    return [
      row(
        'products-total',
        {
          label: 'Total',
          qty: 0,
          adjustments: 0,
          sales: 0,
        },
        { isTotal: true },
      ),
    ];
  }

  const byGroup = new Map<string, LineAgg[]>();
  for (const line of products.values()) {
    const list = byGroup.get(line.group) ?? [];
    list.push(line);
    byGroup.set(line.group, list);
  }

  const rows: ReportRow[] = [];
  let totalQty = 0;
  let totalAdj = 0;
  let totalSales = 0;

  for (const [group, lines] of sortGroups([...byGroup.entries()], sortBy)) {
    const sortedLines = sortLines(lines, sortBy);
    let groupQty = 0;
    let groupAdj = 0;
    let groupSales = 0;
    for (const line of sortedLines) {
      groupQty += line.qty;
      groupAdj += line.adjustments;
      groupSales += line.sales;
    }

    rows.push(
      row(
        `prod-group-${group}`,
        {
          label: group,
          qty: round2(groupQty),
          adjustments: moneyOrDash(groupAdj),
          sales: round2(groupSales),
        },
        { isGroup: true },
      ),
    );

    for (const line of sortedLines) {
      rows.push(
        row(
          `prod-${group}-${line.name}`,
          {
            label: line.name,
            qty: round2(line.qty),
            adjustments: moneyOrDash(line.adjustments),
            sales: round2(line.sales),
          },
          { depth: 1 },
        ),
      );
    }

    totalQty += groupQty;
    totalAdj += groupAdj;
    totalSales += groupSales;
  }

  rows.push(
    row(
      'products-total',
      {
        label: 'Total',
        qty: round2(totalQty),
        adjustments: moneyOrDash(totalAdj),
        sales: round2(totalSales),
      },
      { isTotal: true },
    ),
  );

  return rows;
}

function buildRefundRows(
  refunds: Map<string, RefundAgg>,
  sortBy: SortByMode,
): ReportRow[] {
  if (refunds.size === 0) {
    return [
      row(
        'refunds-total',
        {
          label: 'Total',
          refundCount: 0,
          returnedCredits: null,
          refundAmount: 0,
        },
        { isTotal: true },
      ),
    ];
  }

  const byGroup = new Map<string, RefundAgg[]>();
  for (const line of refunds.values()) {
    const list = byGroup.get(line.group) ?? [];
    list.push(line);
    byGroup.set(line.group, list);
  }

  const groupEntries = [...byGroup.entries()].map(([group, lines]) => {
    let refundCount = 0;
    let refundAmount = 0;
    for (const line of lines) {
      refundCount += line.refundCount;
      refundAmount += line.refundAmount;
    }
    return { group, lines, refundCount, refundAmount };
  });

  if (sortBy === 'name') {
    groupEntries.sort((a, b) => a.group.localeCompare(b.group));
  } else if (sortBy === 'quantity') {
    groupEntries.sort(
      (a, b) =>
        b.refundCount - a.refundCount || a.group.localeCompare(b.group),
    );
  } else {
    groupEntries.sort(
      (a, b) =>
        b.refundAmount - a.refundAmount || a.group.localeCompare(b.group),
    );
  }

  const rows: ReportRow[] = [];
  let totalCount = 0;
  let totalCredits = 0;
  let totalAmount = 0;

  for (const entry of groupEntries) {
    const lines = [...entry.lines];
    if (sortBy === 'name') {
      lines.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'quantity') {
      lines.sort(
        (a, b) =>
          b.refundCount - a.refundCount || a.name.localeCompare(b.name),
      );
    } else {
      lines.sort(
        (a, b) =>
          b.refundAmount - a.refundAmount || a.name.localeCompare(b.name),
      );
    }

    let groupCount = 0;
    let groupCredits = 0;
    let groupAmount = 0;
    for (const line of lines) {
      groupCount += line.refundCount;
      groupCredits += line.returnedCredits;
      groupAmount += line.refundAmount;
    }

    rows.push(
      row(
        `ref-group-${entry.group}`,
        {
          label: entry.group,
          refundCount: groupCount,
          returnedCredits: moneyOrDash(groupCredits),
          refundAmount: round2(groupAmount),
        },
        { isGroup: true },
      ),
    );

    for (const line of lines) {
      rows.push(
        row(
          `ref-${entry.group}-${line.name}`,
          {
            label: line.name,
            refundCount: line.refundCount,
            returnedCredits: moneyOrDash(line.returnedCredits),
            refundAmount: round2(line.refundAmount),
          },
          { depth: 1 },
        ),
      );
    }

    totalCount += groupCount;
    totalCredits += groupCredits;
    totalAmount += groupAmount;
  }

  rows.push(
    row(
      'refunds-total',
      {
        label: 'Total',
        refundCount: totalCount,
        returnedCredits: moneyOrDash(totalCredits),
        refundAmount: round2(totalAmount),
      },
      { isTotal: true },
    ),
  );

  return rows;
}

@Injectable()
export class ProductSalesProvider implements ReportDataProvider {
  readonly key = 'product_sales';

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';
    const rawGroupBy = asString(filters.groupBy, 'brand');
    const groupBy: GroupByMode =
      rawGroupBy === 'category' ? 'category' : 'brand';
    const rawSortBy = asString(filters.sortBy, 'total_sales');
    const sortBy: SortByMode =
      rawSortBy === 'name' || rawSortBy === 'quantity'
        ? rawSortBy
        : 'total_sales';
    const includeDaily = asBoolean(filters.includeDailyDetails);
    const filterRefundsBy = asString(filters.filterRefundsBy, 'sale_date');

    const invoices = await loadClosedInvoicesWithItems(
      this.prisma,
      businessId,
      range.start,
      range.end,
    );

    const overall = new Map<string, LineAgg>();
    const byDay = new Map<string, Map<string, LineAgg>>();

    for (const inv of invoices) {
      const saleDate = inv.closedAt ?? inv.issueDate;
      const day = dayKeyFromDate(saleDate, timezone);
      const dayMap = byDay.get(day) ?? new Map<string, LineAgg>();

      for (const item of inv.items) {
        if (item.lineType !== InvoiceLineType.PRODUCT) continue;

        const qty = moneyNumber(item.quantity);
        const sales = moneyNumber(item.totalPrice);
        const listUnit = moneyNumber(item.product?.unitPrice ?? item.unitPrice);
        const listTotal = listUnit * qty;
        const adjustments = Math.max(0, listTotal - sales);
        const id = item.productId ?? `title:${item.title}`;
        const name = item.product?.name ?? item.title;
        const group = resolveGroupLabel(groupBy, item.product);

        accumulateLine(overall, {
          id,
          name,
          group,
          qty,
          adjustments,
          sales,
        });
        accumulateLine(dayMap, {
          id,
          name,
          group,
          qty,
          adjustments,
          sales,
        });
      }

      if (dayMap.size > 0) {
        byDay.set(day, dayMap);
      }
    }

    const refundMap = await this.loadRefundsByProduct({
      businessId,
      rangeStart: range.start,
      rangeEnd: range.end,
      filterRefundsBy,
      groupBy,
    });

    const columns = productColumns(groupBy);
    const sections: ReportSection[] = [
      section('products', columns, buildProductRows(overall, sortBy)),
    ];

    sections.push(
      section(
        'refunds',
        refundColumns(groupBy),
        buildRefundRows(refundMap, sortBy),
        {
          title: 'Refunds',
          pageBreakBefore: true,
          pageBreakHeader: 'none',
        },
      ),
    );

    if (includeDaily) {
      const days = [...byDay.keys()].sort((a, b) => a.localeCompare(b));
      days.forEach((day, index) => {
        sections.push(
          section(
            `day-${day}`,
            columns,
            buildProductRows(byDay.get(day)!, sortBy),
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
        title: 'Product Sales',
        description: 'Shows the quantities and sales totals of products.',
        periodLabel: range.periodLabel,
        context,
        footnotes: FOOTNOTES,
      }),
      sections,
    );
  }

  private async loadRefundsByProduct(params: {
    businessId: string;
    rangeStart: Date;
    rangeEnd: Date;
    filterRefundsBy: string;
    groupBy: GroupByMode;
  }): Promise<Map<string, RefundAgg>> {
    const refunds = await this.prisma.payment.findMany({
      where:
        params.filterRefundsBy === 'refund_date'
          ? refundedPaymentWhere(params.businessId, {
              start: params.rangeStart,
              end: params.rangeEnd,
            })
          : refundedPaymentWhere(params.businessId),
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
            items: {
              select: {
                lineType: true,
                title: true,
                totalPrice: true,
                productId: true,
                product: {
                  select: {
                    name: true,
                    brand: true,
                    category: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      take: 5000,
    });

    const map = new Map<string, RefundAgg>();

    for (const payment of refunds) {
      if (!isRefundedPayment(payment)) continue;

      const invoice = payment.invoice;
      if (!invoice) continue;

      const saleDate = invoice.closedAt ?? invoice.issueDate;
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

      const productItems = invoice.items.filter(
        (item) => item.lineType === InvoiceLineType.PRODUCT,
      );
      const refundAmount = refundAmountValue(payment);

      if (productItems.length === 0) {
        const id = 'uncategorized';
        const group = params.groupBy === 'brand' ? 'No Brand' : 'Uncategorized';
        const agg =
          map.get(id) ??
          ({
            name: group,
            group,
            refundCount: 0,
            returnedCredits: 0,
            refundAmount: 0,
          } satisfies RefundAgg);
        agg.refundCount += 1;
        agg.refundAmount += refundAmount;
        map.set(id, agg);
        continue;
      }

      const totalProductSales = productItems.reduce(
        (sum, item) => sum + moneyNumber(item.totalPrice),
        0,
      );

      let primaryId: string | null = null;
      let primarySales = -1;
      for (const item of productItems) {
        const sales = moneyNumber(item.totalPrice);
        const id = item.productId ?? `title:${item.title}`;
        if (sales > primarySales) {
          primarySales = sales;
          primaryId = id;
        }
      }

      for (const item of productItems) {
        const id = item.productId ?? `title:${item.title}`;
        const name = item.product?.name ?? item.title;
        const group = resolveGroupLabel(params.groupBy, item.product);
        const share =
          totalProductSales > 0
            ? moneyNumber(item.totalPrice) / totalProductSales
            : 1 / productItems.length;
        const agg =
          map.get(id) ??
          ({
            name,
            group,
            refundCount: 0,
            returnedCredits: 0,
            refundAmount: 0,
          } satisfies RefundAgg);
        if (id === primaryId) {
          agg.refundCount += 1;
        }
        agg.refundAmount += refundAmount * share;
        map.set(id, agg);
      }
    }

    return map;
  }
}
