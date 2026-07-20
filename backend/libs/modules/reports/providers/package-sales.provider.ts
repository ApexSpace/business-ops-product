import { Injectable } from '@nestjs/common';
import {
  ClientPackageSource,
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

type LineAgg = {
  name: string;
  qty: number;
  adjustments: number;
  sales: number;
};

type RefundAgg = {
  name: string;
  refundCount: number;
  refundAmount: number;
};

const SALES_COLUMNS: ReportColumn[] = [
  { key: 'name', label: 'Name', format: 'text', align: 'left' },
  { key: 'qty', label: '# Packages', format: 'int', align: 'right' },
  { key: 'adjustments', label: 'Adjustments', format: 'money', align: 'right' },
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
  map: Map<string, LineAgg>,
  params: { name: string; qty: number; adjustments: number; sales: number },
): void {
  const key = params.name || 'Package';
  const agg = map.get(key) ?? {
    name: key,
    qty: 0,
    adjustments: 0,
    sales: 0,
  };
  agg.qty += params.qty;
  agg.adjustments += params.adjustments;
  agg.sales += params.sales;
  map.set(key, agg);
}

function accumulateRefund(
  map: Map<string, RefundAgg>,
  params: { name: string; refundCount: number; refundAmount: number },
): void {
  const key = params.name || 'Package';
  const agg = map.get(key) ?? {
    name: key,
    refundCount: 0,
    refundAmount: 0,
  };
  agg.refundCount += params.refundCount;
  agg.refundAmount += params.refundAmount;
  map.set(key, agg);
}

function buildSalesRows(map: Map<string, LineAgg>): ReportRow[] {
  const lines = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  let totalQty = 0;
  let totalAdjustments = 0;
  let totalSales = 0;

  const rows: ReportRow[] = lines.map((line) => {
    totalQty += line.qty;
    totalAdjustments += line.adjustments;
    totalSales += line.sales;
    return row(`pkg-${line.name}`, {
      name: line.name,
      qty: round2(line.qty),
      adjustments: round2(line.adjustments),
      sales: round2(line.sales),
    });
  });

  rows.push(
    row(
      'sales-total',
      {
        name: 'Total',
        qty: round2(totalQty),
        adjustments: round2(totalAdjustments),
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
export class PackageSalesProvider implements ReportDataProvider {
  readonly key = 'package_sales';
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

    const overall = new Map<string, LineAgg>();
    const byDay = new Map<string, Map<string, LineAgg>>();

    const invoices = await this.prisma.invoice.findMany({
      where: {
        businessId,
        deletedAt: null,
        items: { some: { lineType: InvoiceLineType.PACKAGE } },
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
          where: { lineType: InvoiceLineType.PACKAGE },
          select: {
            id: true,
            title: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            metadata: true,
          },
        },
      },
      take: 5000,
    });

    const invoiceIds = new Set(invoices.map((invoice) => invoice.id));
    const templateIds = new Set<string>();
    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const meta = parseItemMeta(item.metadata);
        if (typeof meta.packageTemplateId === 'string') {
          templateIds.add(meta.packageTemplateId);
        }
      }
    }

    const templates =
      templateIds.size > 0
        ? await this.prisma.packageTemplate.findMany({
            where: { businessId, id: { in: [...templateIds] } },
            select: { id: true, name: true, totalPrice: true },
          })
        : [];
    const templatesById = new Map(
      templates.map((template) => [template.id, template]),
    );

    for (const invoice of invoices) {
      const saleDate = saleDateFromInvoice(invoice);
      const day = dayKeyFromDate(saleDate, timezone);
      const dayMap = byDay.get(day) ?? new Map<string, LineAgg>();

      for (const item of invoice.items) {
        const meta = parseItemMeta(item.metadata);
        const templateId =
          typeof meta.packageTemplateId === 'string'
            ? meta.packageTemplateId
            : null;
        const template = templateId
          ? templatesById.get(templateId)
          : undefined;

        const qty = Math.max(1, moneyNumber(item.quantity));
        const sales = moneyNumber(item.totalPrice);
        const listUnit = moneyNumber(
          template?.totalPrice ?? item.unitPrice,
        );
        const adjustments = Math.max(0, listUnit * qty - sales);
        const name = template?.name ?? item.title;

        accumulateSale(overall, { name, qty, adjustments, sales });
        accumulateSale(dayMap, { name, qty, adjustments, sales });
      }

      if (dayMap.size > 0) {
        byDay.set(day, dayMap);
      }
    }

    // Online / staff packages not already counted via a closed PACKAGE invoice line.
    const onlinePackages = await this.prisma.clientPackage.findMany({
      where: {
        businessId,
        source: {
          in: [ClientPackageSource.ONLINE, ClientPackageSource.STAFF],
        },
        purchaseDate: { gte: range.start, lte: range.end },
        OR: [
          { invoiceId: null },
          { invoiceId: { notIn: [...invoiceIds] } },
        ],
      },
      include: {
        packageTemplate: { select: { name: true, totalPrice: true } },
      },
      take: 5000,
    });

    for (const pkg of onlinePackages) {
      // Skip if this package's sale invoice was already included above.
      if (pkg.invoiceId && invoiceIds.has(pkg.invoiceId)) continue;

      const day = dayKeyFromDate(pkg.purchaseDate, timezone);
      const dayMap = byDay.get(day) ?? new Map<string, LineAgg>();
      const name = pkg.packageTemplate.name;
      const sales = moneyNumber(pkg.packageTemplate.totalPrice);

      accumulateSale(overall, { name, qty: 1, adjustments: 0, sales });
      accumulateSale(dayMap, { name, qty: 1, adjustments: 0, sales });
      byDay.set(day, dayMap);
    }

    const refundMap = await this.loadPackageRefunds({
      businessId,
      rangeStart: range.start,
      rangeEnd: range.end,
      filterRefundsBy,
    });

    const sections: ReportSection[] = [
      section('sales', SALES_COLUMNS, buildSalesRows(overall)),
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
        title: 'Package Sales',
        description: 'Shows the quantities and sales totals of packages.',
        periodLabel: range.periodLabel,
        context,
      }),
      sections,
    );
  }

  private async loadPackageRefunds(params: {
    businessId: string;
    rangeStart: Date;
    rangeEnd: Date;
    filterRefundsBy: string;
  }): Promise<Map<string, RefundAgg>> {
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
          items: { some: { lineType: InvoiceLineType.PACKAGE } },
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
              where: { lineType: InvoiceLineType.PACKAGE },
              select: {
                title: true,
                quantity: true,
                totalPrice: true,
                metadata: true,
              },
            },
          },
        },
      },
      take: 5000,
    });

    const templateIds = new Set<string>();
    for (const payment of payments) {
      for (const item of payment.invoice?.items ?? []) {
        const meta = parseItemMeta(item.metadata);
        if (typeof meta.packageTemplateId === 'string') {
          templateIds.add(meta.packageTemplateId);
        }
      }
    }

    const templates =
      templateIds.size > 0
        ? await this.prisma.packageTemplate.findMany({
            where: {
              businessId: params.businessId,
              id: { in: [...templateIds] },
            },
            select: { id: true, name: true },
          })
        : [];
    const templatesById = new Map(
      templates.map((template) => [template.id, template]),
    );

    const map = new Map<string, RefundAgg>();

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

      const packageItems = payment.invoice.items;
      if (packageItems.length === 0) continue;

      const packageSales = packageItems.reduce(
        (sum, item) => sum + moneyNumber(item.totalPrice),
        0,
      );
      if (packageSales <= 0) continue;

      const invoiceSubtotal = moneyNumber(payment.invoice.subtotal);
      const share =
        invoiceSubtotal > 0 ? Math.min(1, packageSales / invoiceSubtotal) : 1;
      const refundTotal = round2(refundAmountValue(payment) * share);

      for (const item of packageItems) {
        const meta = parseItemMeta(item.metadata);
        const templateId =
          typeof meta.packageTemplateId === 'string'
            ? meta.packageTemplateId
            : null;
        const name =
          (templateId ? templatesById.get(templateId)?.name : undefined) ??
          item.title;
        const itemSales = moneyNumber(item.totalPrice);
        const portion =
          packageSales > 0 ? itemSales / packageSales : 1 / packageItems.length;
        const qty = Math.max(1, moneyNumber(item.quantity));

        accumulateRefund(map, {
          name,
          refundCount: qty,
          refundAmount: round2(refundTotal * portion),
        });
      }
    }

    return map;
  }
}
