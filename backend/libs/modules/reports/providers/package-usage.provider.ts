import { Injectable } from '@nestjs/common';
import {
  InvoiceLineType,
  InvoiceStatus,
  PackageHistoryEventType,
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
  parsePaymentMeta,
  refundAmountValue,
  refundedPaymentWhere,
  refundTimestamp,
} from '../utils/refunded-payments.util';

const USAGE_COLUMNS: ReportColumn[] = [
  { key: 'date', label: 'Date', format: 'text', align: 'left' },
  { key: 'saleNumber', label: 'Sale #', format: 'text', align: 'left' },
  { key: 'client', label: 'Client', format: 'text', align: 'left' },
  { key: 'packageName', label: 'Package', format: 'text', align: 'left' },
  { key: 'createdDate', label: 'Created Date', format: 'text', align: 'left' },
  { key: 'service', label: 'Service', format: 'text', align: 'left' },
  { key: 'value', label: 'Value', format: 'money', align: 'right' },
];

const SERVICE_REFUND_COLUMNS: ReportColumn[] = [
  { key: 'refundDate', label: 'Refund Date', format: 'text', align: 'left' },
  { key: 'refundNumber', label: 'Refund #', format: 'text', align: 'left' },
  { key: 'saleDate', label: 'Sale Date', format: 'text', align: 'left' },
  { key: 'saleNumber', label: 'Sale #', format: 'text', align: 'left' },
  { key: 'client', label: 'Client', format: 'text', align: 'left' },
  { key: 'packageName', label: 'Package', format: 'text', align: 'left' },
  { key: 'createdDate', label: 'Created Date', format: 'text', align: 'left' },
  { key: 'service', label: 'Service', format: 'text', align: 'left' },
  {
    key: 'returnedCredits',
    label: '# Returned Credits',
    format: 'int',
    align: 'right',
  },
  {
    key: 'refundAmount',
    label: 'Refund Amount',
    format: 'money',
    align: 'right',
  },
];

const PRODUCT_REFUND_COLUMNS: ReportColumn[] = [
  { key: 'refundDate', label: 'Refund Date', format: 'text', align: 'left' },
  { key: 'refundNumber', label: 'Refund #', format: 'text', align: 'left' },
  { key: 'saleDate', label: 'Sale Date', format: 'text', align: 'left' },
  { key: 'saleNumber', label: 'Sale #', format: 'text', align: 'left' },
  { key: 'client', label: 'Client', format: 'text', align: 'left' },
  { key: 'packageName', label: 'Package', format: 'text', align: 'left' },
  { key: 'createdDate', label: 'Created Date', format: 'text', align: 'left' },
  {
    key: 'productUsage',
    label: 'Product Usage',
    format: 'text',
    align: 'left',
  },
  {
    key: 'returnedCredits',
    label: '# Returned Credits',
    format: 'int',
    align: 'right',
  },
  { key: 'value', label: 'Value', format: 'money', align: 'right' },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function shortCode(id: string, length = 8): string {
  return id.replace(/-/g, '').slice(0, length).toUpperCase();
}

function formatReportDate(date: Date, timezone: string): string {
  return DateTime.fromJSDate(date, { zone: 'utc' })
    .setZone(timezone || 'UTC')
    .toFormat('LLL d, yyyy');
}

function contactLabel(
  contact:
    | {
        displayName: string | null;
        firstName: string | null;
        lastName: string | null;
      }
    | null
    | undefined,
): string {
  if (!contact) return '';
  return (
    contact.displayName ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
    ''
  );
}

function parseItemMeta(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function isPackageApplied(meta: Record<string, unknown>): boolean {
  return (
    typeof meta.clientPackageId === 'string' || meta.packageRedemption === true
  );
}

function resolveSaleNumber(
  invoice: { displaySequence: number | null } | null | undefined,
): string {
  return invoice?.displaySequence != null
    ? String(invoice.displaySequence)
    : '';
}

function saleDateFromInvoice(invoice: {
  closedAt: Date | null;
  issueDate: Date;
}): Date {
  return invoice.closedAt ?? invoice.issueDate;
}

function buildRefundNumber(payment: {
  id: string;
  stripeRefundId: string | null;
  providerMetadata: unknown;
}): string {
  if (payment.stripeRefundId) {
    return shortCode(payment.stripeRefundId, 10);
  }
  const meta = parsePaymentMeta(payment.providerMetadata);
  if (typeof meta.refundId === 'string' && meta.refundId.trim()) {
    return meta.refundId.trim();
  }
  return `R${shortCode(payment.id, 7)}`;
}

/** Per-credit package value for a service, falling back to service list price. */
function packageCreditValue(params: {
  servicePrice: number;
  packageTotalPrice: number;
  totalInitialCredits: number;
}): number {
  if (params.totalInitialCredits > 0 && params.packageTotalPrice > 0) {
    return round2(params.packageTotalPrice / params.totalInitialCredits);
  }
  return round2(params.servicePrice);
}

@Injectable()
export class PackageUsageProvider implements ReportDataProvider {
  readonly key = 'package_usage';

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';
    const filterRefundsBy = asString(filters.filterRefundsBy, 'sale_date');

    const [usageRows, serviceRefundRows] = await Promise.all([
      this.buildServiceUsageRows(businessId, range, timezone),
      this.buildServiceUsageRefundRows(
        businessId,
        range,
        timezone,
        filterRefundsBy,
      ),
    ]);

    const productRefundRows: ReportRow[] = [
      row(
        'product-refunds-total',
        {
          refundDate: 'Total',
          refundNumber: '',
          saleDate: '',
          saleNumber: '',
          client: '',
          packageName: '',
          createdDate: '',
          productUsage: '',
          returnedCredits: 0,
          value: 0,
        },
        { isTotal: true },
      ),
    ];

    const sections: ReportSection[] = [
      section('service-usage', USAGE_COLUMNS, usageRows),
      section(
        'service-usage-refunds',
        SERVICE_REFUND_COLUMNS,
        serviceRefundRows,
        { title: 'Service Usage Refunds' },
      ),
      section(
        'product-usage-refunds',
        PRODUCT_REFUND_COLUMNS,
        productRefundRows,
        { title: 'Product Usage Refunds' },
      ),
    ];

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Package Usage',
        description: 'Shows the details of package usages.',
        periodLabel: range.periodLabel,
        context,
      }),
      sections,
    );
  }

  private async buildServiceUsageRows(
    businessId: string,
    range: { start: Date; end: Date },
    timezone: string,
  ): Promise<ReportRow[]> {
    const events = await this.prisma.packageHistoryEvent.findMany({
      where: {
        eventType: PackageHistoryEventType.REDEEMED,
        createdAt: { gte: range.start, lte: range.end },
        clientPackage: { businessId },
      },
      include: {
        clientPackage: {
          include: {
            contact: {
              select: { displayName: true, firstName: true, lastName: true },
            },
            packageTemplate: { select: { name: true, totalPrice: true } },
            serviceAllocations: { select: { initialQty: true } },
            invoice: { select: { displaySequence: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const serviceIds = [
      ...new Set(
        events
          .map((event) => event.serviceId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const services =
      serviceIds.length > 0
        ? await this.prisma.service.findMany({
            where: { businessId, id: { in: serviceIds } },
            select: { id: true, name: true, price: true },
          })
        : [];
    const servicesById = new Map(services.map((service) => [service.id, service]));

    // Checkout-applied package usages (sale-linked).
    const invoices = await this.prisma.invoice.findMany({
      where: {
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
        items: {
          some: {
            lineType: InvoiceLineType.SERVICE,
          },
        },
      },
      select: {
        id: true,
        displaySequence: true,
        closedAt: true,
        issueDate: true,
        contact: {
          select: { displayName: true, firstName: true, lastName: true },
        },
        items: {
          where: { lineType: InvoiceLineType.SERVICE },
          select: {
            id: true,
            title: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            metadata: true,
            service: { select: { id: true, name: true, price: true } },
          },
        },
      },
      take: 5000,
    });

    const packageIdsFromInvoices = new Set<string>();
    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const meta = parseItemMeta(item.metadata);
        if (typeof meta.clientPackageId === 'string') {
          packageIdsFromInvoices.add(meta.clientPackageId);
        }
      }
    }

    const packagesFromInvoices =
      packageIdsFromInvoices.size > 0
        ? await this.prisma.clientPackage.findMany({
            where: {
              businessId,
              id: { in: [...packageIdsFromInvoices] },
            },
            include: {
              packageTemplate: { select: { name: true, totalPrice: true } },
              serviceAllocations: { select: { initialQty: true } },
            },
          })
        : [];
    const packagesById = new Map(
      packagesFromInvoices.map((pkg) => [pkg.id, pkg]),
    );

    let totalValue = 0;
    const rows: ReportRow[] = [];
    const coveredEventKeys = new Set<string>();

    for (const invoice of invoices) {
      const saleDate = saleDateFromInvoice(invoice);
      for (const item of invoice.items) {
        const meta = parseItemMeta(item.metadata);
        if (!isPackageApplied(meta)) continue;

        const clientPackageId =
          typeof meta.clientPackageId === 'string'
            ? meta.clientPackageId
            : null;
        const pkg = clientPackageId
          ? packagesById.get(clientPackageId)
          : undefined;

        const qty = Math.max(1, moneyNumber(item.quantity));
        const listUnit = moneyNumber(item.service?.price ?? item.unitPrice);
        const value = round2(listUnit * qty);
        totalValue += value;

        if (clientPackageId && item.service?.id) {
          coveredEventKeys.add(
            `${clientPackageId}:${item.service.id}:${saleDate.toISOString().slice(0, 10)}`,
          );
        }

        rows.push(
          row(`invoice-${invoice.id}-${item.id}`, {
            date: formatReportDate(saleDate, timezone),
            saleNumber: resolveSaleNumber(invoice),
            client: contactLabel(invoice.contact),
            packageName: pkg?.packageTemplate.name ?? '',
            createdDate: pkg
              ? formatReportDate(pkg.purchaseDate ?? pkg.createdAt, timezone)
              : '',
            service: item.service?.name ?? item.title,
            value,
          }),
        );
      }
    }

    for (const event of events) {
      const pkg = event.clientPackage;
      const service = event.serviceId
        ? servicesById.get(event.serviceId)
        : undefined;
      const dayKey = event.createdAt.toISOString().slice(0, 10);
      const dedupeKey = `${pkg.id}:${event.serviceId ?? ''}:${dayKey}`;
      if (coveredEventKeys.has(dedupeKey)) continue;

      const totalInitialCredits = pkg.serviceAllocations.reduce(
        (sum, allocation) => sum + allocation.initialQty,
        0,
      );
      const credits = Math.abs(event.quantityChange ?? 1);
      const unitValue = packageCreditValue({
        servicePrice: moneyNumber(service?.price ?? 0),
        packageTotalPrice: moneyNumber(pkg.packageTemplate.totalPrice),
        totalInitialCredits,
      });
      const value = round2(unitValue * credits);
      totalValue += value;

      rows.push(
        row(event.id, {
          date: formatReportDate(event.createdAt, timezone),
          saleNumber: '',
          client: contactLabel(pkg.contact),
          packageName: pkg.packageTemplate.name,
          createdDate: formatReportDate(
            pkg.purchaseDate ?? pkg.createdAt,
            timezone,
          ),
          service: service?.name ?? '',
          value,
        }),
      );
    }

    rows.sort((a, b) => String(b.cells.date).localeCompare(String(a.cells.date)));

    rows.push(
      row(
        'usage-total',
        {
          date: 'Total',
          saleNumber: '',
          client: '',
          packageName: '',
          createdDate: '',
          service: '',
          value: round2(totalValue),
        },
        { isTotal: true },
      ),
    );

    return rows;
  }

  private async buildServiceUsageRefundRows(
    businessId: string,
    range: { start: Date; end: Date },
    timezone: string,
    filterRefundsBy: string,
  ): Promise<ReportRow[]> {
    const rows: ReportRow[] = [];
    let totalCredits = 0;
    let totalAmount = 0;

    // Returned credits via package quantity adjustments.
    const adjustments = await this.prisma.packageHistoryEvent.findMany({
      where: {
        eventType: PackageHistoryEventType.ADJUSTED,
        quantityChange: { gt: 0 },
        ...(filterRefundsBy === 'refund_date'
          ? { createdAt: { gte: range.start, lte: range.end } }
          : {}),
        clientPackage: { businessId },
      },
      include: {
        clientPackage: {
          include: {
            contact: {
              select: { displayName: true, firstName: true, lastName: true },
            },
            packageTemplate: { select: { name: true, totalPrice: true } },
            serviceAllocations: { select: { initialQty: true } },
            invoice: {
              select: {
                displaySequence: true,
                closedAt: true,
                issueDate: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const adjustmentServiceIds = [
      ...new Set(
        adjustments
          .map((event) => event.serviceId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const adjustmentServices =
      adjustmentServiceIds.length > 0
        ? await this.prisma.service.findMany({
            where: { businessId, id: { in: adjustmentServiceIds } },
            select: { id: true, name: true, price: true },
          })
        : [];
    const adjustmentServicesById = new Map(
      adjustmentServices.map((service) => [service.id, service]),
    );

    for (const event of adjustments) {
      const pkg = event.clientPackage;
      const purchaseSaleDate = pkg.invoice
        ? saleDateFromInvoice(pkg.invoice)
        : pkg.purchaseDate;

      if (filterRefundsBy === 'sale_date') {
        if (
          purchaseSaleDate < range.start ||
          purchaseSaleDate > range.end
        ) {
          continue;
        }
      }

      const service = event.serviceId
        ? adjustmentServicesById.get(event.serviceId)
        : undefined;
      const credits = event.quantityChange ?? 0;
      const totalInitialCredits = pkg.serviceAllocations.reduce(
        (sum, allocation) => sum + allocation.initialQty,
        0,
      );
      const unitValue = packageCreditValue({
        servicePrice: moneyNumber(service?.price ?? 0),
        packageTotalPrice: moneyNumber(pkg.packageTemplate.totalPrice),
        totalInitialCredits,
      });
      const refundAmount = round2(unitValue * credits);
      totalCredits += credits;
      totalAmount += refundAmount;

      rows.push(
        row(`adjust-${event.id}`, {
          refundDate: formatReportDate(event.createdAt, timezone),
          refundNumber: `R${shortCode(event.id, 7)}`,
          saleDate: formatReportDate(purchaseSaleDate, timezone),
          saleNumber: resolveSaleNumber(pkg.invoice),
          client: contactLabel(pkg.contact),
          packageName: pkg.packageTemplate.name,
          createdDate: formatReportDate(
            pkg.purchaseDate ?? pkg.createdAt,
            timezone,
          ),
          service: service?.name ?? '',
          returnedCredits: credits,
          refundAmount,
        }),
      );
    }

    // Refunded payments on sales that applied package credits.
    const payments = await this.prisma.payment.findMany({
      where: {
        ...(filterRefundsBy === 'refund_date'
          ? refundedPaymentWhere(businessId, {
              start: range.start,
              end: range.end,
            })
          : refundedPaymentWhere(businessId)),
        invoice: {
          deletedAt: null,
          items: { some: { lineType: InvoiceLineType.SERVICE } },
        },
      },
      select: {
        id: true,
        amount: true,
        status: true,
        stripeRefundId: true,
        providerMetadata: true,
        updatedAt: true,
        invoice: {
          select: {
            displaySequence: true,
            closedAt: true,
            issueDate: true,
            subtotal: true,
            contact: {
              select: { displayName: true, firstName: true, lastName: true },
            },
            items: {
              where: { lineType: InvoiceLineType.SERVICE },
              select: {
                title: true,
                quantity: true,
                unitPrice: true,
                totalPrice: true,
                metadata: true,
                service: { select: { name: true, price: true } },
              },
            },
          },
        },
      },
      take: 5000,
    });

    const refundPackageIds = new Set<string>();
    for (const payment of payments) {
      for (const item of payment.invoice?.items ?? []) {
        const meta = parseItemMeta(item.metadata);
        if (typeof meta.clientPackageId === 'string') {
          refundPackageIds.add(meta.clientPackageId);
        }
      }
    }
    const refundPackages =
      refundPackageIds.size > 0
        ? await this.prisma.clientPackage.findMany({
            where: { businessId, id: { in: [...refundPackageIds] } },
            include: {
              packageTemplate: { select: { name: true } },
            },
          })
        : [];
    const refundPackagesById = new Map(
      refundPackages.map((pkg) => [pkg.id, pkg]),
    );

    for (const payment of payments) {
      if (!isRefundedPayment(payment) || !payment.invoice) continue;

      const packageItems = payment.invoice.items.filter((item) =>
        isPackageApplied(parseItemMeta(item.metadata)),
      );
      if (packageItems.length === 0) continue;

      const saleDate = saleDateFromInvoice(payment.invoice);
      const refundedAt = refundTimestamp(payment);
      if (filterRefundsBy === 'sale_date') {
        if (saleDate < range.start || saleDate > range.end) continue;
      } else if (refundedAt < range.start || refundedAt > range.end) {
        continue;
      }

      const packageSales = packageItems.reduce(
        (sum, item) => sum + moneyNumber(item.service?.price ?? item.unitPrice) * Math.max(1, moneyNumber(item.quantity)),
        0,
      );
      const invoiceSubtotal = moneyNumber(payment.invoice.subtotal);
      const share =
        invoiceSubtotal > 0 ? Math.min(1, packageSales / invoiceSubtotal) : 1;
      const refundAmount = round2(refundAmountValue(payment) * share);
      const returnedCredits = packageItems.reduce(
        (sum, item) => sum + Math.max(1, moneyNumber(item.quantity)),
        0,
      );

      const firstMeta = parseItemMeta(packageItems[0]!.metadata);
      const clientPackageId =
        typeof firstMeta.clientPackageId === 'string'
          ? firstMeta.clientPackageId
          : null;
      const pkg = clientPackageId
        ? refundPackagesById.get(clientPackageId)
        : undefined;

      totalCredits += returnedCredits;
      totalAmount += refundAmount;

      rows.push(
        row(`payment-${payment.id}`, {
          refundDate: formatReportDate(refundedAt, timezone),
          refundNumber: buildRefundNumber(payment),
          saleDate: formatReportDate(saleDate, timezone),
          saleNumber: resolveSaleNumber(payment.invoice),
          client: contactLabel(payment.invoice.contact),
          packageName: pkg?.packageTemplate.name ?? '',
          createdDate: pkg
            ? formatReportDate(pkg.purchaseDate ?? pkg.createdAt, timezone)
            : '',
          service: packageItems
            .map((item) => item.service?.name ?? item.title)
            .filter(Boolean)
            .join(', '),
          returnedCredits,
          refundAmount,
        }),
      );
    }

    rows.sort((a, b) =>
      String(b.cells.refundDate).localeCompare(String(a.cells.refundDate)),
    );

    rows.push(
      row(
        'service-refunds-total',
        {
          refundDate: 'Total',
          refundNumber: '',
          saleDate: '',
          saleNumber: '',
          client: '',
          packageName: '',
          createdDate: '',
          service: '',
          returnedCredits: totalCredits,
          refundAmount: round2(totalAmount),
        },
        { isTotal: true },
      ),
    );

    return rows;
  }
}
