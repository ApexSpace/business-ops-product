import { Injectable } from '@nestjs/common';
import { InvoiceLineType, InvoiceStatus } from '@prisma/client';
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
  { key: 'membership', label: 'Membership', format: 'text', align: 'left' },
  { key: 'service', label: 'Service', format: 'text', align: 'left' },
  {
    key: 'serviceCredit',
    label: 'Service Credit',
    format: 'int',
    align: 'right',
  },
  { key: 'value', label: 'Value', format: 'money', align: 'right' },
];

const SERVICE_REFUND_COLUMNS: ReportColumn[] = [
  { key: 'refundDate', label: 'Refund Date', format: 'text', align: 'left' },
  { key: 'refundNumber', label: 'Refund #', format: 'text', align: 'left' },
  { key: 'saleDate', label: 'Sale Date', format: 'text', align: 'left' },
  { key: 'saleNumber', label: 'Sale #', format: 'text', align: 'left' },
  { key: 'client', label: 'Client', format: 'text', align: 'left' },
  { key: 'membership', label: 'Membership', format: 'text', align: 'left' },
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
  { key: 'membership', label: 'Membership', format: 'text', align: 'left' },
  { key: 'product', label: 'Product', format: 'text', align: 'left' },
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

function isMembershipRedemption(meta: Record<string, unknown>): boolean {
  return (
    meta.membershipRedemption === true ||
    typeof meta.clientMembershipId === 'string'
  );
}

function saleDateFromInvoice(invoice: {
  closedAt: Date | null;
  issueDate: Date;
}): Date {
  return invoice.closedAt ?? invoice.issueDate;
}

function resolveSaleNumber(
  invoice: { displaySequence: number | null } | null | undefined,
): string {
  return invoice?.displaySequence != null
    ? String(invoice.displaySequence)
    : '';
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

@Injectable()
export class MembershipServiceUsageProvider implements ReportDataProvider {
  readonly key = 'membership_service_usage';

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
          membership: '',
          product: '',
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
        title: 'Membership Credit Usage',
        description: 'Shows the details of membership services used.',
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
        items: { some: { lineType: InvoiceLineType.SERVICE } },
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
            metadata: true,
            service: { select: { id: true, name: true, price: true } },
          },
        },
      },
      take: 5000,
    });

    const membershipIds = new Set<string>();
    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const meta = parseItemMeta(item.metadata);
        if (
          isMembershipRedemption(meta) &&
          typeof meta.clientMembershipId === 'string'
        ) {
          membershipIds.add(meta.clientMembershipId);
        }
      }
    }

    const memberships =
      membershipIds.size > 0
        ? await this.prisma.clientMembership.findMany({
            where: { businessId, id: { in: [...membershipIds] } },
            select: {
              id: true,
              plan: { select: { name: true } },
            },
          })
        : [];
    const membershipsById = new Map(
      memberships.map((membership) => [membership.id, membership]),
    );

    let totalValue = 0;
    const rows: ReportRow[] = [];

    for (const invoice of invoices) {
      const saleDate = saleDateFromInvoice(invoice);
      for (const item of invoice.items) {
        const meta = parseItemMeta(item.metadata);
        if (!isMembershipRedemption(meta)) continue;

        const membershipId =
          typeof meta.clientMembershipId === 'string'
            ? meta.clientMembershipId
            : null;
        const membership = membershipId
          ? membershipsById.get(membershipId)
          : undefined;

        const credits = Math.max(1, moneyNumber(item.quantity));
        const unitValue = moneyNumber(item.service?.price ?? item.unitPrice);
        const value = round2(unitValue * credits);
        totalValue += value;

        rows.push(
          row(`usage-${invoice.id}-${item.id}`, {
            date: formatReportDate(saleDate, timezone),
            saleNumber: resolveSaleNumber(invoice),
            client: contactLabel(invoice.contact),
            membership: membership?.plan.name ?? '',
            service: item.service?.name ?? item.title,
            serviceCredit: credits,
            value,
          }),
        );
      }
    }

    rows.sort((a, b) => String(b.cells.date).localeCompare(String(a.cells.date)));

    rows.push(
      row(
        'usage-total',
        {
          date: 'Total',
          saleNumber: '',
          client: '',
          membership: '',
          service: '',
          serviceCredit: '',
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

    const membershipIds = new Set<string>();
    for (const payment of payments) {
      for (const item of payment.invoice?.items ?? []) {
        const meta = parseItemMeta(item.metadata);
        if (
          isMembershipRedemption(meta) &&
          typeof meta.clientMembershipId === 'string'
        ) {
          membershipIds.add(meta.clientMembershipId);
        }
      }
    }

    const memberships =
      membershipIds.size > 0
        ? await this.prisma.clientMembership.findMany({
            where: { businessId, id: { in: [...membershipIds] } },
            select: {
              id: true,
              plan: { select: { name: true } },
            },
          })
        : [];
    const membershipsById = new Map(
      memberships.map((membership) => [membership.id, membership]),
    );

    let totalCredits = 0;
    let totalAmount = 0;
    const rows: ReportRow[] = [];

    for (const payment of payments) {
      if (!isRefundedPayment(payment) || !payment.invoice) continue;

      const membershipItems = payment.invoice.items.filter((item) =>
        isMembershipRedemption(parseItemMeta(item.metadata)),
      );
      if (membershipItems.length === 0) continue;

      const saleDate = saleDateFromInvoice(payment.invoice);
      const refundedAt = refundTimestamp(payment);

      if (filterRefundsBy === 'sale_date') {
        if (saleDate < range.start || saleDate > range.end) continue;
      } else if (refundedAt < range.start || refundedAt > range.end) {
        continue;
      }

      const membershipValue = membershipItems.reduce((sum, item) => {
        const credits = Math.max(1, moneyNumber(item.quantity));
        const unitValue = moneyNumber(item.service?.price ?? item.unitPrice);
        return sum + unitValue * credits;
      }, 0);

      const invoiceSubtotal = moneyNumber(payment.invoice.subtotal);
      const share =
        invoiceSubtotal > 0
          ? Math.min(1, membershipValue / invoiceSubtotal)
          : 1;
      const refundAmount = round2(refundAmountValue(payment) * share);
      const returnedCredits = membershipItems.reduce(
        (sum, item) => sum + Math.max(1, moneyNumber(item.quantity)),
        0,
      );

      const firstMeta = parseItemMeta(membershipItems[0]!.metadata);
      const membershipId =
        typeof firstMeta.clientMembershipId === 'string'
          ? firstMeta.clientMembershipId
          : null;
      const membership = membershipId
        ? membershipsById.get(membershipId)
        : undefined;

      totalCredits += returnedCredits;
      totalAmount += refundAmount;

      rows.push(
        row(`refund-${payment.id}`, {
          refundDate: formatReportDate(refundedAt, timezone),
          refundNumber: buildRefundNumber(payment),
          saleDate: formatReportDate(saleDate, timezone),
          saleNumber: resolveSaleNumber(payment.invoice),
          client: contactLabel(payment.invoice.contact),
          membership: membership?.plan.name ?? '',
          service: membershipItems
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
          membership: '',
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
