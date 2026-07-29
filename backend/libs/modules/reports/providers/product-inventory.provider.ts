import { Injectable } from '@nestjs/common';
import {
  ProductInventoryAdjustmentType,
  ProductStatus,
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
  asString,
  moneyNumber,
} from '../utils/report-date-range.util';
import {
  buildDocument,
  buildReportMeta,
  row,
  section,
} from '../utils/report-document.builder';

type GroupByMode = 'brand' | 'category';

type InventoryLine = {
  id: string;
  name: string;
  group: string;
  stock: number;
  costValue: number;
  retailValue: number;
};

type AdjustmentRow = {
  productId: string;
  type: ProductInventoryAdjustmentType;
  quantityChange: number;
  createdAt: Date;
};

const DESCRIPTION =
  'Shows the stock of products at the end of the selected day.';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function resolveAsOfDate(filters: ReportFilters, timezone: string): DateTime {
  const raw = filters.asOfDate;
  if (typeof raw === 'string' && raw.length >= 10) {
    const parsed = DateTime.fromISO(raw.slice(0, 10), { zone: timezone });
    if (parsed.isValid) return parsed.endOf('day');
  }
  return DateTime.now().setZone(timezone || 'UTC').endOf('day');
}

function formatAsOfLabel(dt: DateTime): string {
  return dt.toFormat('LLL d, yyyy');
}

function resolveGroupLabel(
  groupBy: GroupByMode,
  product: {
    brand: string | null;
    category: { name: string } | null;
  },
): string {
  if (groupBy === 'brand') {
    const brand = product.brand?.trim();
    return brand && brand.length > 0 ? brand : 'No Brand';
  }
  return product.category?.name ?? 'Uncategorized';
}

/**
 * Reconstruct stock at end of `asOfCutoff` from current stock + adjustment ledger.
 *
 * - Prefer reversing post-cutoff deltas from current stock (preserves initial stock
 *   that may never have been written as an adjustment).
 * - When a RECOUNT exists after the cutoff (absolute quantity, not a delta),
 *   replay the ledger with a baseline so current stock still reconciles.
 */
export function stockAtEndOfDay(
  currentStock: number,
  adjustments: AdjustmentRow[],
  asOfCutoff: Date,
): number {
  const sorted = [...adjustments].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const after = sorted.filter((adj) => adj.createdAt.getTime() > asOfCutoff.getTime());
  const hasRecountAfter = after.some(
    (adj) => adj.type === ProductInventoryAdjustmentType.RECOUNT,
  );

  if (!hasRecountAfter) {
    const deltaAfter = after.reduce((sum, adj) => sum + adj.quantityChange, 0);
    return currentStock - deltaAfter;
  }

  let replayedNow = 0;
  for (const adj of sorted) {
    if (adj.type === ProductInventoryAdjustmentType.RECOUNT) {
      replayedNow = adj.quantityChange;
    } else {
      replayedNow += adj.quantityChange;
    }
  }
  const baseline = currentStock - replayedNow;

  let stock = baseline;
  for (const adj of sorted) {
    if (adj.createdAt.getTime() > asOfCutoff.getTime()) break;
    if (adj.type === ProductInventoryAdjustmentType.RECOUNT) {
      stock = adj.quantityChange;
    } else {
      stock += adj.quantityChange;
    }
  }
  return stock;
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
    { key: 'stock', label: 'Stock', format: 'int', align: 'right' },
    { key: 'costValue', label: 'Cost Value', format: 'money', align: 'right' },
    {
      key: 'retailValue',
      label: 'Retail Value',
      format: 'money',
      align: 'right',
    },
  ];
}

function cellsFor(line: {
  label: string;
  stock: number;
  costValue: number;
  retailValue: number;
}) {
  return {
    label: line.label,
    stock: Math.round(line.stock),
    costValue: round2(line.costValue),
    retailValue: round2(line.retailValue),
  };
}

function buildInventoryRows(
  lines: InventoryLine[],
  idPrefix: string,
): ReportRow[] {
  if (lines.length === 0) {
    return [
      row(
        `${idPrefix}-total`,
        cellsFor({ label: 'Total', stock: 0, costValue: 0, retailValue: 0 }),
        { isTotal: true },
      ),
    ];
  }

  const byGroup = new Map<string, InventoryLine[]>();
  for (const line of lines) {
    const list = byGroup.get(line.group) ?? [];
    list.push(line);
    byGroup.set(line.group, list);
  }

  const groupEntries = [...byGroup.entries()]
    .map(([group, groupLines]) => {
      let retail = 0;
      for (const line of groupLines) retail += line.retailValue;
      return { group, groupLines, retail };
    })
    .sort(
      (a, b) => b.retail - a.retail || a.group.localeCompare(b.group),
    );

  const rows: ReportRow[] = [];
  let totalStock = 0;
  let totalCost = 0;
  let totalRetail = 0;

  for (const { group, groupLines } of groupEntries) {
    const sorted = [...groupLines].sort(
      (a, b) => b.retailValue - a.retailValue || a.name.localeCompare(b.name),
    );
    let groupStock = 0;
    let groupCost = 0;
    let groupRetail = 0;
    for (const line of sorted) {
      groupStock += line.stock;
      groupCost += line.costValue;
      groupRetail += line.retailValue;
    }

    rows.push(
      row(
        `${idPrefix}-group-${group}`,
        cellsFor({
          label: group,
          stock: groupStock,
          costValue: groupCost,
          retailValue: groupRetail,
        }),
        { isGroup: true },
      ),
    );

    for (const line of sorted) {
      rows.push(
        row(
          `${idPrefix}-${line.id}`,
          cellsFor({
            label: line.name,
            stock: line.stock,
            costValue: line.costValue,
            retailValue: line.retailValue,
          }),
          { depth: 1 },
        ),
      );
    }

    totalStock += groupStock;
    totalCost += groupCost;
    totalRetail += groupRetail;
  }

  rows.push(
    row(
      `${idPrefix}-total`,
      cellsFor({
        label: 'Total',
        stock: totalStock,
        costValue: totalCost,
        retailValue: totalRetail,
      }),
      { isTotal: true },
    ),
  );

  return rows;
}

@Injectable()
export class ProductInventoryProvider implements ReportDataProvider {
  readonly key = 'product_inventory';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const timezone = context.timezone || 'UTC';
    const asOf = resolveAsOfDate(filters, timezone);
    const asOfCutoff = asOf.toUTC().toJSDate();
    const periodLabel = `At End Of Day: ${formatAsOfLabel(asOf)}`;
    const rawGroupBy = asString(filters.groupBy, 'category');
    const groupBy: GroupByMode =
      rawGroupBy === 'brand' ? 'brand' : 'category';

    const products = await this.prisma.product.findMany({
      where: {
        businessId,
        deletedAt: null,
        trackInventory: true,
        status: ProductStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        brand: true,
        stockQuantity: true,
        purchaseCost: true,
        unitPrice: true,
        considerAsSalesRevenue: true,
        category: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const productIds = products.map((p) => p.id);
    const adjustments =
      productIds.length > 0
        ? await this.prisma.productInventoryAdjustment.findMany({
            where: {
              businessId,
              productId: { in: productIds },
            },
            select: {
              productId: true,
              type: true,
              quantityChange: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          })
        : [];

    const adjustmentsByProduct = new Map<string, AdjustmentRow[]>();
    for (const adj of adjustments) {
      const list = adjustmentsByProduct.get(adj.productId) ?? [];
      list.push(adj);
      adjustmentsByProduct.set(adj.productId, list);
    }

    const included: InventoryLine[] = [];
    const excluded: InventoryLine[] = [];

    for (const product of products) {
      const stock = stockAtEndOfDay(
        product.stockQuantity,
        adjustmentsByProduct.get(product.id) ?? [],
        asOfCutoff,
      );
      const unitCost = moneyNumber(product.purchaseCost);
      const unitRetail = moneyNumber(product.unitPrice);
      const line: InventoryLine = {
        id: product.id,
        name: product.name,
        group: resolveGroupLabel(groupBy, product),
        stock,
        costValue: stock * unitCost,
        retailValue: stock * unitRetail,
      };

      if (product.considerAsSalesRevenue) {
        included.push(line);
      } else {
        excluded.push(line);
      }
    }

    const columns = columnsFor(groupBy);

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Product Inventory',
        description: DESCRIPTION,
        periodLabel,
        context,
      }),
      [
        section('inventory', columns, buildInventoryRows(included, 'inv')),
        section(
          'excluded',
          columns,
          buildInventoryRows(excluded, 'excl'),
          {
            title: 'Excluded from revenue:',
            pageBreakHeader: 'none',
          },
        ),
      ],
    );
  }
}
