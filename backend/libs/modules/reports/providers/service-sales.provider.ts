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

type LineAgg = {
  name: string;
  category: string;
  qty: number;
  adjustments: number;
  appliedPackages: number;
  sales: number;
};

type RefundAgg = {
  name: string;
  category: string;
  refundCount: number;
  returnedCredits: number;
  refundAmount: number;
};

type CustomAgg = {
  name: string;
  count: number;
  amount: number;
};

const SERVICE_COLUMNS: ReportColumn[] = [
  {
    key: 'label',
    label: 'Service Category/Service',
    format: 'text',
    align: 'left',
  },
  { key: 'qty', label: '# Services', format: 'int' },
  { key: 'adjustments', label: 'Adjustments', format: 'money' },
  { key: 'appliedPackages', label: 'Applied Packages', format: 'money' },
  { key: 'sales', label: 'Sales', format: 'money' },
];

const REFUND_COLUMNS: ReportColumn[] = [
  {
    key: 'label',
    label: 'Service Category/Service',
    format: 'text',
    align: 'left',
  },
  { key: 'refundCount', label: '# Refunds', format: 'int' },
  { key: 'returnedCredits', label: '# Returned Credits', format: 'int' },
  { key: 'refundAmount', label: 'Refunds', format: 'money' },
];

const CUSTOMIZATION_COLUMNS: ReportColumn[] = [
  {
    key: 'label',
    label: 'Customization/Service',
    format: 'text',
    align: 'left',
  },
  { key: 'count', label: '# Count', format: 'int' },
  { key: 'amount', label: 'Total Amount', format: 'money' },
];

const FOOTNOTES = [
  'The sales total includes the value of applied packages.',
  'The sales amount does not account for any refunds that were issued.',
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function moneyOrDash(n: number): number | null {
  return Math.abs(n) < 0.005 ? null : round2(n);
}

function parseItemMeta(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function isPackageOrMembershipApplied(meta: Record<string, unknown>): boolean {
  return (
    meta.membershipRedemption === true ||
    typeof meta.clientPackageId === 'string' ||
    meta.packageRedemption === true
  );
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

/** Pull customization selections from invoice-line metadata when present. */
function extractCustomizations(
  meta: Record<string, unknown>,
  fallbackServiceName: string,
): Array<{ name: string; count: number; amount: number }> {
  const raw =
    meta.customizations ??
    meta.selectedOptions ??
    meta.options ??
    meta.serviceOptions;
  if (!Array.isArray(raw)) return [];

  const out: Array<{ name: string; count: number; amount: number }> = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    const name =
      (typeof item.name === 'string' && item.name) ||
      (typeof item.label === 'string' && item.label) ||
      (typeof item.title === 'string' && item.title) ||
      fallbackServiceName;
    const count = Math.max(1, moneyNumber(item.count ?? item.quantity ?? 1));
    const amount = moneyNumber(
      item.amount ?? item.totalPrice ?? item.priceAdjustment ?? item.price ?? 0,
    );
    out.push({ name, count, amount });
  }
  return out;
}

function accumulateLine(
  map: Map<string, LineAgg>,
  params: {
    id: string;
    name: string;
    category: string;
    qty: number;
    adjustments: number;
    appliedPackages: number;
    sales: number;
  },
): void {
  const agg =
    map.get(params.id) ??
    ({
      name: params.name,
      category: params.category,
      qty: 0,
      adjustments: 0,
      appliedPackages: 0,
      sales: 0,
    } satisfies LineAgg);
  agg.qty += params.qty;
  agg.adjustments += params.adjustments;
  agg.appliedPackages += params.appliedPackages;
  agg.sales += params.sales;
  map.set(params.id, agg);
}

function buildServiceRows(services: Map<string, LineAgg>): ReportRow[] {
  if (services.size === 0) {
    return [
      row(
        'services-total',
        {
          label: 'Total',
          qty: 0,
          adjustments: 0,
          appliedPackages: 0,
          sales: 0,
        },
        { isTotal: true },
      ),
    ];
  }

  const byCategory = new Map<string, LineAgg[]>();
  for (const line of services.values()) {
    const list = byCategory.get(line.category) ?? [];
    list.push(line);
    byCategory.set(line.category, list);
  }

  const rows: ReportRow[] = [];
  let totalQty = 0;
  let totalAdj = 0;
  let totalPkg = 0;
  let totalSales = 0;

  for (const [category, lines] of [...byCategory.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    let catQty = 0;
    let catAdj = 0;
    let catPkg = 0;
    let catSales = 0;
    for (const line of lines) {
      catQty += line.qty;
      catAdj += line.adjustments;
      catPkg += line.appliedPackages;
      catSales += line.sales;
    }

    rows.push(
      row(
        `svc-cat-${category}`,
        {
          label: category,
          qty: round2(catQty),
          adjustments: moneyOrDash(catAdj),
          appliedPackages: moneyOrDash(catPkg),
          sales: round2(catSales),
        },
        { isGroup: true },
      ),
    );

    for (const line of lines.sort((a, b) => a.name.localeCompare(b.name))) {
      rows.push(
        row(
          `svc-${category}-${line.name}`,
          {
            label: line.name,
            qty: round2(line.qty),
            adjustments: moneyOrDash(line.adjustments),
            appliedPackages: moneyOrDash(line.appliedPackages),
            sales: round2(line.sales),
          },
          { depth: 1 },
        ),
      );
    }

    totalQty += catQty;
    totalAdj += catAdj;
    totalPkg += catPkg;
    totalSales += catSales;
  }

  rows.push(
    row(
      'services-total',
      {
        label: 'Total',
        qty: round2(totalQty),
        adjustments: moneyOrDash(totalAdj),
        appliedPackages: moneyOrDash(totalPkg),
        sales: round2(totalSales),
      },
      { isTotal: true },
    ),
  );

  return rows;
}

function buildRefundRows(refunds: Map<string, RefundAgg>): ReportRow[] {
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

  const byCategory = new Map<string, RefundAgg[]>();
  for (const line of refunds.values()) {
    const list = byCategory.get(line.category) ?? [];
    list.push(line);
    byCategory.set(line.category, list);
  }

  const rows: ReportRow[] = [];
  let totalCount = 0;
  let totalCredits = 0;
  let totalAmount = 0;

  for (const [category, lines] of [...byCategory.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    let catCount = 0;
    let catCredits = 0;
    let catAmount = 0;
    for (const line of lines) {
      catCount += line.refundCount;
      catCredits += line.returnedCredits;
      catAmount += line.refundAmount;
    }

    rows.push(
      row(
        `ref-cat-${category}`,
        {
          label: category,
          refundCount: catCount,
          returnedCredits: moneyOrDash(catCredits),
          refundAmount: round2(catAmount),
        },
        { isGroup: true },
      ),
    );

    for (const line of lines.sort((a, b) => a.name.localeCompare(b.name))) {
      rows.push(
        row(
          `ref-${category}-${line.name}`,
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

    totalCount += catCount;
    totalCredits += catCredits;
    totalAmount += catAmount;
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

function buildCustomizationRows(customs: Map<string, CustomAgg>): ReportRow[] {
  const lines = [...customs.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  let totalCount = 0;
  let totalAmount = 0;
  const rows: ReportRow[] = lines.map((line) => {
    totalCount += line.count;
    totalAmount += line.amount;
    return row(`custom-${line.name}`, {
      label: line.name,
      count: round2(line.count),
      amount: round2(line.amount),
    });
  });

  rows.push(
    row(
      'custom-total',
      {
        label: 'Total Amount',
        count: round2(totalCount),
        amount: round2(totalAmount),
      },
      { isTotal: true },
    ),
  );
  return rows;
}

@Injectable()
export class ServiceSalesProvider implements ReportDataProvider {
  readonly key = 'service_sales';

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';
    const includeDaily = asBoolean(filters.includeDailyDetails);
    const includeCustomizations = asBoolean(
      filters.includeCustomizationDetails,
    );
    const filterRefundsBy = asString(filters.filterRefundsBy, 'sale_date');

    const invoices = await loadClosedInvoicesWithItems(
      this.prisma,
      businessId,
      range.start,
      range.end,
    );

    const overall = new Map<string, LineAgg>();
    const byDay = new Map<string, Map<string, LineAgg>>();
    const customizations = new Map<string, CustomAgg>();

    for (const inv of invoices) {
      const saleDate = inv.closedAt ?? inv.issueDate;
      const day = dayKeyFromDate(saleDate, timezone);
      const dayMap = byDay.get(day) ?? new Map<string, LineAgg>();

      for (const item of inv.items) {
        const meta = parseItemMeta(item.metadata);
        const qty = moneyNumber(item.quantity);
        const sales = moneyNumber(item.totalPrice);
        const unitPrice = moneyNumber(item.unitPrice);

        if (item.lineType === InvoiceLineType.SERVICE) {
          const listUnit = moneyNumber(item.service?.price ?? item.unitPrice);
          const listTotal = listUnit * qty;
          const packageApplied = isPackageOrMembershipApplied(meta);
          const appliedPackages = packageApplied ? listTotal : 0;
          const adjustments = packageApplied
            ? 0
            : Math.max(0, listTotal - sales);
          const id = item.serviceId ?? `title:${item.title}`;
          const name = item.service?.name ?? item.title;
          const category = item.service?.category?.name ?? 'Uncategorized';

          accumulateLine(overall, {
            id,
            name,
            category,
            qty,
            adjustments,
            appliedPackages,
            sales,
          });
          accumulateLine(dayMap, {
            id,
            name,
            category,
            qty,
            adjustments,
            appliedPackages,
            sales,
          });

          if (includeCustomizations) {
            for (const custom of extractCustomizations(meta, name)) {
              const key = `${custom.name}::${name}`;
              const label =
                custom.name === name
                  ? custom.name
                  : `${custom.name} / ${name}`;
              const agg =
                customizations.get(key) ??
                ({ name: label, count: 0, amount: 0 } satisfies CustomAgg);
              agg.count += custom.count * qty;
              agg.amount += custom.amount * qty;
              customizations.set(key, agg);
            }
          }
        } else if (
          includeCustomizations &&
          item.lineType === InvoiceLineType.CUSTOM
        ) {
          const name = item.title || 'Customization';
          const agg =
            customizations.get(name) ??
            ({ name, count: 0, amount: 0 } satisfies CustomAgg);
          agg.count += qty || 1;
          agg.amount += sales || unitPrice * qty;
          customizations.set(name, agg);
        }
      }

      if (dayMap.size > 0) {
        byDay.set(day, dayMap);
      }
    }

    const refundMap = await this.loadRefundsByService({
      businessId,
      rangeStart: range.start,
      rangeEnd: range.end,
      filterRefundsBy,
    });

    // Mangomint page order: overview → customizations → refunds → daily tables.
    const sections: ReportSection[] = [
      section('services', SERVICE_COLUMNS, buildServiceRows(overall)),
    ];

    if (includeCustomizations) {
      sections.push(
        section(
          'customizations',
          CUSTOMIZATION_COLUMNS,
          buildCustomizationRows(customizations),
          {
            pageBreakBefore: true,
            pageBreakHeader: 'none',
          },
        ),
      );
    }

    sections.push(
      section('refunds', REFUND_COLUMNS, buildRefundRows(refundMap), {
        title: 'Refunds',
        // Share the customizations page when that filter is on; otherwise own page.
        pageBreakBefore: !includeCustomizations,
        pageBreakHeader: 'none',
      }),
    );

    if (includeDaily) {
      const days = [...byDay.keys()].sort((a, b) => a.localeCompare(b));
      days.forEach((day, index) => {
        sections.push(
          section(
            `day-${day}`,
            SERVICE_COLUMNS,
            buildServiceRows(byDay.get(day)!),
            {
              title: formatDayHeading(day, timezone),
              // First day starts a new page; later days flow on the same page.
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
        title: 'Service Sales',
        description: 'Shows the quantities and sales totals of services.',
        periodLabel: range.periodLabel,
        context,
        footnotes: FOOTNOTES,
      }),
      sections,
    );
  }

  private async loadRefundsByService(params: {
    businessId: string;
    rangeStart: Date;
    rangeEnd: Date;
    filterRefundsBy: string;
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
                serviceId: true,
                service: {
                  select: {
                    name: true,
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

      const serviceItems = invoice.items.filter(
        (item) => item.lineType === InvoiceLineType.SERVICE,
      );
      const refundAmount = refundAmountValue(payment);
      if (serviceItems.length === 0) {
        const id = 'uncategorized';
        const agg =
          map.get(id) ??
          ({
            name: 'Uncategorized',
            category: 'Uncategorized',
            refundCount: 0,
            returnedCredits: 0,
            refundAmount: 0,
          } satisfies RefundAgg);
        agg.refundCount += 1;
        agg.refundAmount += refundAmount;
        map.set(id, agg);
        continue;
      }

      const totalServiceSales = serviceItems.reduce(
        (sum, item) => sum + moneyNumber(item.totalPrice),
        0,
      );

      let primaryId: string | null = null;
      let primarySales = -1;
      for (const item of serviceItems) {
        const sales = moneyNumber(item.totalPrice);
        const id = item.serviceId ?? `title:${item.title}`;
        if (sales > primarySales) {
          primarySales = sales;
          primaryId = id;
        }
      }

      for (const item of serviceItems) {
        const id = item.serviceId ?? `title:${item.title}`;
        const name = item.service?.name ?? item.title;
        const category = item.service?.category?.name ?? 'Uncategorized';
        const share =
          totalServiceSales > 0
            ? moneyNumber(item.totalPrice) / totalServiceSales
            : 1 / serviceItems.length;
        const agg =
          map.get(id) ??
          ({
            name,
            category,
            refundCount: 0,
            returnedCredits: 0,
            refundAmount: 0,
          } satisfies RefundAgg);
        // Count once per refund (on the largest service line) so Total matches payment count.
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
