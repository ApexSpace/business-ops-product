import { Injectable } from '@nestjs/common';
import {
  ProductInventoryAdjustmentType,
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
  asString,
  resolveReportDateRange,
} from '../utils/report-date-range.util';
import {
  buildDocument,
  buildReportMeta,
  row,
  section,
} from '../utils/report-document.builder';

const COLUMNS: ReportColumn[] = [
  { key: 'date', label: 'Date', format: 'text', align: 'left' },
  { key: 'product', label: 'Product', format: 'text', align: 'left' },
  { key: 'type', label: 'Type', format: 'text', align: 'left' },
  {
    key: 'stockChange',
    label: 'Stock Change',
    format: 'int',
    align: 'right',
  },
  {
    key: 'staffMember',
    label: 'Staff Member',
    format: 'text',
    align: 'left',
  },
];

const DESCRIPTION = 'Shows product inventory changes.';

function formatChangeDate(date: Date, timezone: string): string {
  return DateTime.fromJSDate(date, { zone: 'utc' })
    .setZone(timezone || 'UTC')
    .toFormat('LLL d');
}

function formatChangeType(type: ProductInventoryAdjustmentType): string {
  switch (type) {
    case ProductInventoryAdjustmentType.RECEIVED:
      return 'Received Stock';
    case ProductInventoryAdjustmentType.RECOUNT:
      return 'Recount';
    case ProductInventoryAdjustmentType.PROFESSIONAL_USE:
      return 'Professional Use';
    case ProductInventoryAdjustmentType.SALE:
      return 'Sale';
    case ProductInventoryAdjustmentType.RETURNED:
      return 'Returned';
    case ProductInventoryAdjustmentType.OTHER:
    default:
      return 'Stock adjustment';
  }
}

function staffLabel(
  actor: { firstName: string | null; lastName: string | null } | null,
): string {
  if (!actor) return '';
  return [actor.firstName, actor.lastName].filter(Boolean).join(' ') || '';
}

@Injectable()
export class ProductInventoryChangesProvider implements ReportDataProvider {
  readonly key = 'product_inventory_changes';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';
    const brandFilter = asString(filters.brand, 'all');

    const where: Prisma.ProductInventoryAdjustmentWhereInput = {
      businessId,
      createdAt: { gte: range.start, lte: range.end },
      product: {
        deletedAt: null,
        ...(brandFilter && brandFilter !== 'all'
          ? { brand: brandFilter }
          : {}),
      },
    };

    const adjustments = await this.prisma.productInventoryAdjustment.findMany({
      where,
      include: {
        product: { select: { name: true, brand: true } },
        actor: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const rows: ReportRow[] = adjustments.map((adjustment) =>
      row(adjustment.id, {
        date: formatChangeDate(adjustment.createdAt, timezone),
        product: adjustment.product.name,
        type: formatChangeType(adjustment.type),
        stockChange: adjustment.quantityChange,
        staffMember: staffLabel(adjustment.actor),
      }),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Product Inventory Changes',
        description: DESCRIPTION,
        periodLabel: range.periodLabel,
        context,
      }),
      [section('changes', COLUMNS, rows)],
    );
  }
}
