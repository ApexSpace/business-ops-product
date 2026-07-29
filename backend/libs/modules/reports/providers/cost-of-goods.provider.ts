import { Injectable } from '@nestjs/common';
import { InvoiceLineType } from '@prisma/client';
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
import { loadClosedInvoicesWithItems } from '../utils/closed-invoices.util';

type GroupByMode = 'brand' | 'category';

type LineAgg = {
  name: string;
  group: string;
  qty: number;
  sales: number;
  cost: number;
  adjustments: number;
};

const DESCRIPTION = 'Shows costs and profits of products.';
const FOOTNOTES = [
  'This report only includes products that have purchase costs associated with it.',
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function profitPercent(sales: number, profit: number): number {
  if (Math.abs(sales) < 0.005) return 0;
  return round2((profit / sales) * 100);
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

/**
 * Prefer variant purchase cost when present; otherwise product purchase cost.
 * Returns null when no purchase cost is associated (excluded from COGS).
 */
function resolvePurchaseCost(item: {
  product?: { purchaseCost: unknown } | null;
  variant?: { purchaseCost: unknown } | null;
}): number | null {
  const raw =
    item.variant?.purchaseCost != null
      ? item.variant.purchaseCost
      : item.product?.purchaseCost;
  if (raw == null) return null;
  const cost = moneyNumber(raw);
  return cost > 0 ? cost : null;
}

function accumulateLine(
  map: Map<string, LineAgg>,
  params: {
    id: string;
    name: string;
    group: string;
    qty: number;
    sales: number;
    cost: number;
    adjustments: number;
  },
): void {
  const agg =
    map.get(params.id) ??
    ({
      name: params.name,
      group: params.group,
      qty: 0,
      sales: 0,
      cost: 0,
      adjustments: 0,
    } satisfies LineAgg);
  agg.qty += params.qty;
  agg.sales += params.sales;
  agg.cost += params.cost;
  agg.adjustments += params.adjustments;
  map.set(params.id, agg);
}

function sortBySales(lines: LineAgg[]): LineAgg[] {
  return [...lines].sort(
    (a, b) => b.sales - a.sales || a.name.localeCompare(b.name),
  );
}

function columnsFor(groupBy: GroupByMode): ReportColumn[] {
  const groupLabel = groupBy === 'brand' ? 'Brand' : 'Product Category';
  return [
    {
      key: 'label',
      label: `${groupLabel}/Product`,
      format: 'text',
      align: 'left',
    },
    { key: 'qty', label: '# Products', format: 'int', align: 'right' },
    { key: 'sales', label: 'Sales', format: 'money', align: 'right' },
    { key: 'cost', label: 'Cost', format: 'money', align: 'right' },
    {
      key: 'adjustments',
      label: 'Adjustments',
      format: 'money',
      align: 'right',
    },
    { key: 'profit', label: 'Profit', format: 'money', align: 'right' },
    {
      key: 'profitPercent',
      label: 'Profit %',
      format: 'percent',
      align: 'right',
    },
  ];
}

function cellsFor(agg: {
  label: string;
  qty: number;
  sales: number;
  cost: number;
  adjustments: number;
}) {
  const sales = round2(agg.sales);
  const cost = round2(agg.cost);
  const profit = round2(sales - cost);
  return {
    label: agg.label,
    qty: round2(agg.qty),
    sales,
    cost,
    adjustments: round2(agg.adjustments),
    profit,
    profitPercent: profitPercent(sales, profit),
  };
}

function buildRows(products: Map<string, LineAgg>): ReportRow[] {
  if (products.size === 0) {
    return [
      row(
        'cogs-total',
        {
          label: 'Total',
          qty: '',
          sales: 0,
          cost: 0,
          adjustments: 0,
          profit: 0,
          profitPercent: 0,
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

  const groupEntries = [...byGroup.entries()]
    .map(([group, lines]) => {
      let sales = 0;
      for (const line of lines) sales += line.sales;
      return { group, lines, sales };
    })
    .sort(
      (a, b) => b.sales - a.sales || a.group.localeCompare(b.group),
    );

  const rows: ReportRow[] = [];
  let totalQty = 0;
  let totalSales = 0;
  let totalCost = 0;
  let totalAdj = 0;

  for (const { group, lines } of groupEntries) {
    const sorted = sortBySales(lines);
    let groupQty = 0;
    let groupSales = 0;
    let groupCost = 0;
    let groupAdj = 0;
    for (const line of sorted) {
      groupQty += line.qty;
      groupSales += line.sales;
      groupCost += line.cost;
      groupAdj += line.adjustments;
    }

    rows.push(
      row(
        `cogs-group-${group}`,
        cellsFor({
          label: group,
          qty: groupQty,
          sales: groupSales,
          cost: groupCost,
          adjustments: groupAdj,
        }),
        { isGroup: true },
      ),
    );

    for (const line of sorted) {
      rows.push(
        row(
          `cogs-${group}-${line.name}`,
          cellsFor({
            label: line.name,
            qty: line.qty,
            sales: line.sales,
            cost: line.cost,
            adjustments: line.adjustments,
          }),
          { depth: 1 },
        ),
      );
    }

    totalQty += groupQty;
    totalSales += groupSales;
    totalCost += groupCost;
    totalAdj += groupAdj;
  }

  rows.push(
    row(
      'cogs-total',
      cellsFor({
        label: 'Total',
        qty: totalQty,
        sales: totalSales,
        cost: totalCost,
        adjustments: totalAdj,
      }),
      { isTotal: true },
    ),
  );

  return rows;
}

/**
 * Cost of Goods Sold (Mangomint parity).
 *
 * - Only product lines with an associated purchase cost (> 0).
 * - Sales = charged line total.
 * - Cost = qty × purchase cost (variant cost preferred over product cost).
 * - Adjustments = max(0, list price × qty − sales).
 * - Profit = Sales − Cost.
 * - Profit % = Profit / Sales × 100 (0 when sales are 0).
 */
@Injectable()
export class CostOfGoodsProvider implements ReportDataProvider {
  readonly key = 'cost_of_goods';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const rawGroupBy = asString(filters.groupBy, 'category');
    const groupBy: GroupByMode =
      rawGroupBy === 'brand' ? 'brand' : 'category';

    const invoices = await loadClosedInvoicesWithItems(
      this.prisma,
      businessId,
      range.start,
      range.end,
    );

    const products = new Map<string, LineAgg>();

    for (const inv of invoices) {
      for (const item of inv.items) {
        if (item.lineType !== InvoiceLineType.PRODUCT) continue;

        const purchaseCost = resolvePurchaseCost(item);
        if (purchaseCost == null) continue;

        const qty = moneyNumber(item.quantity);
        const sales = moneyNumber(item.totalPrice);
        const listUnit = moneyNumber(
          item.variant?.price ?? item.product?.unitPrice ?? item.unitPrice,
        );
        const adjustments = Math.max(0, listUnit * qty - sales);
        const cost = qty * purchaseCost;

        const id = item.productId ?? `title:${item.title}`;
        const name = item.product?.name ?? item.title;
        const group = resolveGroupLabel(groupBy, item.product);

        accumulateLine(products, {
          id,
          name,
          group,
          qty,
          sales,
          cost,
          adjustments,
        });
      }
    }

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Cost of Goods Sold',
        description: DESCRIPTION,
        periodLabel: range.periodLabel,
        context,
        footnotes: FOOTNOTES,
      }),
      [section('cogs', columnsFor(groupBy), buildRows(products))],
    );
  }
}
