import { Injectable } from '@nestjs/common';
import {
  InvoiceLineType,
  ProductInventoryAdjustmentType,
  ProductStatus,
} from '@prisma/client';
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
import { stockAtEndOfDay } from './product-inventory.provider';

type GroupByMode = 'brand' | 'category';

type UsageLine = {
  id: string;
  name: string;
  group: string;
  productsSold: number;
  professionalUse: number;
  serviceUsage: number;
  endStock: number;
};

type AdjustmentRow = {
  productId: string;
  type: ProductInventoryAdjustmentType;
  quantityChange: number;
  serviceId: string | null;
  createdAt: Date;
};

const DESCRIPTION =
  'Shows end stock quantities based on sold products, professional use products, and service usage.';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
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

function columnsFor(groupBy: GroupByMode): ReportColumn[] {
  const groupLabel = groupBy === 'brand' ? 'Brand' : 'Product Category';
  return [
    {
      key: 'label',
      label: `${groupLabel}/Product`,
      format: 'text',
      align: 'left',
    },
    {
      key: 'productsSold',
      label: 'Products Sold',
      format: 'int',
      align: 'right',
    },
    {
      key: 'professionalUse',
      label: 'Professional Use',
      format: 'int',
      align: 'right',
    },
    {
      key: 'serviceUsage',
      label: 'Service Usage',
      format: 'int',
      align: 'right',
    },
    {
      key: 'totalUsage',
      label: 'Total Usage',
      format: 'int',
      align: 'right',
    },
    { key: 'endStock', label: 'End Stock', format: 'int', align: 'right' },
  ];
}

function cellsFor(line: {
  label: string;
  productsSold: number;
  professionalUse: number;
  serviceUsage: number;
  endStock: number;
}) {
  const productsSold = round2(line.productsSold);
  const professionalUse = round2(line.professionalUse);
  const serviceUsage = round2(line.serviceUsage);
  return {
    label: line.label,
    productsSold,
    professionalUse,
    serviceUsage,
    totalUsage: round2(productsSold + professionalUse + serviceUsage),
    endStock: Math.round(line.endStock),
  };
}

function buildRows(lines: UsageLine[]): ReportRow[] {
  if (lines.length === 0) {
    return [
      row(
        'usage-total',
        cellsFor({
          label: 'Total',
          productsSold: 0,
          professionalUse: 0,
          serviceUsage: 0,
          endStock: 0,
        }),
        { isTotal: true },
      ),
    ];
  }

  const byGroup = new Map<string, UsageLine[]>();
  for (const line of lines) {
    const list = byGroup.get(line.group) ?? [];
    list.push(line);
    byGroup.set(line.group, list);
  }

  const groupEntries = [...byGroup.entries()]
    .map(([group, groupLines]) => {
      let sold = 0;
      for (const line of groupLines) sold += line.productsSold;
      return { group, groupLines, sold };
    })
    .sort((a, b) => b.sold - a.sold || a.group.localeCompare(b.group));

  const rows: ReportRow[] = [];
  let totalSold = 0;
  let totalProf = 0;
  let totalService = 0;
  let totalEnd = 0;

  for (const { group, groupLines } of groupEntries) {
    const sorted = [...groupLines].sort(
      (a, b) =>
        b.productsSold - a.productsSold || a.name.localeCompare(b.name),
    );
    let groupSold = 0;
    let groupProf = 0;
    let groupService = 0;
    let groupEnd = 0;
    for (const line of sorted) {
      groupSold += line.productsSold;
      groupProf += line.professionalUse;
      groupService += line.serviceUsage;
      groupEnd += line.endStock;
    }

    rows.push(
      row(
        `usage-group-${group}`,
        cellsFor({
          label: group,
          productsSold: groupSold,
          professionalUse: groupProf,
          serviceUsage: groupService,
          endStock: groupEnd,
        }),
        { isGroup: true },
      ),
    );

    for (const line of sorted) {
      rows.push(
        row(
          `usage-${line.id}`,
          cellsFor({
            label: line.name,
            productsSold: line.productsSold,
            professionalUse: line.professionalUse,
            serviceUsage: line.serviceUsage,
            endStock: line.endStock,
          }),
          { depth: 1 },
        ),
      );
    }

    totalSold += groupSold;
    totalProf += groupProf;
    totalService += groupService;
    totalEnd += groupEnd;
  }

  rows.push(
    row(
      'usage-total',
      cellsFor({
        label: 'Total',
        productsSold: totalSold,
        professionalUse: totalProf,
        serviceUsage: totalService,
        endStock: totalEnd,
      }),
      { isTotal: true },
    ),
  );

  return rows;
}

/**
 * Product Stock & Usage (Mangomint parity).
 *
 * - Products Sold: closed-sale PRODUCT line quantities in the period
 *   (not SALE inventory adjustments — those mirror checkout and would double-count).
 * - Professional Use: PROFESSIONAL_USE inventory adjustments in the period.
 * - Service Usage: inventory adjustments linked to a service in the period.
 * - Total Usage: sold + professional + service.
 * - End Stock: reconstructed stock at end of the selected period.
 */
@Injectable()
export class ProductStockUsageProvider implements ReportDataProvider {
  readonly key = 'product_stock_usage';
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
    const brandFilter = asString(filters.brand, 'all');

    const products = await this.prisma.product.findMany({
      where: {
        businessId,
        deletedAt: null,
        trackInventory: true,
        status: ProductStatus.ACTIVE,
        ...(brandFilter && brandFilter !== 'all'
          ? { brand: brandFilter }
          : {}),
      },
      select: {
        id: true,
        name: true,
        brand: true,
        stockQuantity: true,
        category: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const productIds = new Set(products.map((p) => p.id));

    const soldByProduct = new Map<string, number>();
    const invoices = await loadClosedInvoicesWithItems(
      this.prisma,
      businessId,
      range.start,
      range.end,
    );
    for (const inv of invoices) {
      for (const item of inv.items) {
        if (item.lineType !== InvoiceLineType.PRODUCT || !item.productId) {
          continue;
        }
        if (!productIds.has(item.productId)) continue;
        soldByProduct.set(
          item.productId,
          (soldByProduct.get(item.productId) ?? 0) + moneyNumber(item.quantity),
        );
      }
    }

    const adjustments =
      products.length > 0
        ? await this.prisma.productInventoryAdjustment.findMany({
            where: {
              businessId,
              productId: { in: [...productIds] },
            },
            select: {
              productId: true,
              type: true,
              quantityChange: true,
              serviceId: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          })
        : [];

    const adjustmentsByProduct = new Map<string, AdjustmentRow[]>();
    const profUseByProduct = new Map<string, number>();
    const serviceUseByProduct = new Map<string, number>();

    for (const adj of adjustments) {
      const list = adjustmentsByProduct.get(adj.productId) ?? [];
      list.push(adj);
      adjustmentsByProduct.set(adj.productId, list);

      const inPeriod =
        adj.createdAt.getTime() >= range.start.getTime() &&
        adj.createdAt.getTime() <= range.end.getTime();
      if (!inPeriod) continue;

      const qty = Math.abs(adj.quantityChange);
      if (adj.type === ProductInventoryAdjustmentType.PROFESSIONAL_USE) {
        profUseByProduct.set(
          adj.productId,
          (profUseByProduct.get(adj.productId) ?? 0) + qty,
        );
      }
      // Service usage is product usage tied to a service; keep it disjoint from
      // retail SALE and PROFESSIONAL_USE so Total Usage does not double-count.
      if (
        adj.serviceId &&
        adj.type !== ProductInventoryAdjustmentType.SALE &&
        adj.type !== ProductInventoryAdjustmentType.PROFESSIONAL_USE
      ) {
        serviceUseByProduct.set(
          adj.productId,
          (serviceUseByProduct.get(adj.productId) ?? 0) + qty,
        );
      }
    }

    const lines: UsageLine[] = products.map((product) => ({
      id: product.id,
      name: product.name,
      group: resolveGroupLabel(groupBy, product),
      productsSold: soldByProduct.get(product.id) ?? 0,
      professionalUse: profUseByProduct.get(product.id) ?? 0,
      serviceUsage: serviceUseByProduct.get(product.id) ?? 0,
      endStock: stockAtEndOfDay(
        product.stockQuantity,
        adjustmentsByProduct.get(product.id) ?? [],
        range.end,
      ),
    }));

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Product Stock & Usage',
        description: DESCRIPTION,
        periodLabel: range.periodLabel,
        context,
      }),
      [section('stock', columnsFor(groupBy), buildRows(lines))],
    );
  }
}
