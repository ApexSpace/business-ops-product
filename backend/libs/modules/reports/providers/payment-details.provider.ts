import { Injectable } from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
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
import { staffDisplayName } from '../utils/closed-invoices.util';
import {
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

const COLUMNS: ReportColumn[] = [
  { key: 'saleNumber', label: 'Sale #', format: 'text', align: 'left' },
  {
    key: 'paymentDate',
    label: 'Payment Date',
    format: 'text',
    align: 'left',
  },
  { key: 'saleDate', label: 'Sale Date', format: 'text', align: 'left' },
  { key: 'client', label: 'Client', format: 'text', align: 'left' },
  {
    key: 'staffMembers',
    label: 'Staff Member(s)',
    format: 'text',
    align: 'left',
  },
  { key: 'amount', label: 'Amount', format: 'money', align: 'right' },
  {
    key: 'paymentMethod',
    label: 'Payment Method',
    format: 'text',
    align: 'left',
  },
  { key: 'saleTotal', label: 'Sale Total', format: 'money', align: 'right' },
  { key: 'reference', label: 'Reference', format: 'text', align: 'left' },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
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

function resolveSaleNumber(
  invoice: { displaySequence: number | null } | null | undefined,
): string {
  return invoice?.displaySequence != null
    ? String(invoice.displaySequence)
    : '';
}

function saleDateFromInvoice(
  invoice:
    | {
        closedAt: Date | null;
        issueDate: Date;
      }
    | null
    | undefined,
  fallback: Date,
): Date {
  return invoice?.closedAt ?? invoice?.issueDate ?? fallback;
}

function formatPaymentMethod(method: PaymentMethod): string {
  switch (method) {
    case PaymentMethod.CASH:
      return 'Cash';
    case PaymentMethod.CARD:
      return 'Card';
    case PaymentMethod.BANK_TRANSFER:
      return 'Bank Transfer';
    case PaymentMethod.WALLET:
      return 'Client Account';
    case PaymentMethod.GIFT_CARD:
      return 'Gift Card';
    case PaymentMethod.STRIPE:
      return 'Card';
    case PaymentMethod.OTHER:
      return 'Other';
    default:
      return String(method);
  }
}

function resolveStaffMembers(invoice: {
  closedBy: {
    firstName: string | null;
    lastName: string | null;
  } | null;
  createdBy: {
    firstName: string | null;
    lastName: string | null;
  } | null;
  items: Array<{
    staffUser: {
      firstName: string | null;
      lastName: string | null;
    } | null;
  }>;
} | null): string {
  const names = new Set<string>();

  for (const item of invoice?.items ?? []) {
    const name = staffDisplayName(item.staffUser);
    if (name !== 'Unassigned') names.add(name);
  }

  if (names.size === 0 && invoice?.closedBy) {
    const name = staffDisplayName(invoice.closedBy);
    if (name !== 'Unassigned') names.add(name);
  }

  if (names.size === 0 && invoice?.createdBy) {
    const name = staffDisplayName(invoice.createdBy);
    if (name !== 'Unassigned') names.add(name);
  }

  return [...names].join(', ');
}

const paymentInclude = {
  contact: {
    select: { displayName: true, firstName: true, lastName: true },
  },
  invoice: {
    select: {
      displaySequence: true,
      closedAt: true,
      issueDate: true,
      totalAmount: true,
      closedBy: {
        select: { firstName: true, lastName: true },
      },
      createdBy: {
        select: { firstName: true, lastName: true },
      },
      items: {
        select: {
          staffUser: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class PaymentDetailsProvider implements ReportDataProvider {
  readonly key = 'payment_details';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';

    const [succeededPayments, refundedPayments] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          businessId,
          deletedAt: null,
          status: PaymentStatus.SUCCEEDED,
          OR: [
            { paidAt: { gte: range.start, lte: range.end } },
            {
              paidAt: null,
              createdAt: { gte: range.start, lte: range.end },
            },
          ],
        },
        include: paymentInclude,
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        take: 5000,
      }),
      this.prisma.payment.findMany({
        where: refundedPaymentWhere(businessId, {
          start: range.start,
          end: range.end,
        }),
        include: paymentInclude,
        orderBy: { updatedAt: 'desc' },
        take: 5000,
      }),
    ]);

    let totalAmount = 0;
    const rows: ReportRow[] = [];

    for (const payment of succeededPayments) {
      const occurredAt = payment.paidAt ?? payment.createdAt;
      const amount = round2(moneyNumber(payment.amount));
      totalAmount += amount;
      const saleDate = saleDateFromInvoice(payment.invoice, occurredAt);

      rows.push(
        row(`pay-${payment.id}`, {
          saleNumber: resolveSaleNumber(payment.invoice),
          paymentDate: formatReportDate(occurredAt, timezone),
          saleDate: formatReportDate(saleDate, timezone),
          client: contactLabel(payment.contact),
          staffMembers: resolveStaffMembers(payment.invoice),
          amount,
          paymentMethod: formatPaymentMethod(payment.method),
          saleTotal: round2(moneyNumber(payment.invoice?.totalAmount ?? 0)),
          reference: payment.reference?.trim() || '',
        }),
      );
    }

    for (const payment of refundedPayments) {
      if (!isRefundedPayment(payment)) continue;

      const occurredAt = refundTimestamp(payment);
      if (occurredAt < range.start || occurredAt > range.end) continue;

      const amount = -round2(refundAmountValue(payment));
      totalAmount += amount;
      const saleDate = saleDateFromInvoice(payment.invoice, occurredAt);

      rows.push(
        row(`refund-${payment.id}`, {
          saleNumber: resolveSaleNumber(payment.invoice),
          paymentDate: formatReportDate(occurredAt, timezone),
          saleDate: formatReportDate(saleDate, timezone),
          client: contactLabel(payment.contact),
          staffMembers: resolveStaffMembers(payment.invoice),
          amount,
          paymentMethod: formatPaymentMethod(payment.method),
          saleTotal: round2(moneyNumber(payment.invoice?.totalAmount ?? 0)),
          reference: payment.reference?.trim() || payment.stripeRefundId || '',
        }),
      );
    }

    rows.sort((a, b) =>
      String(b.cells.paymentDate).localeCompare(String(a.cells.paymentDate)),
    );

    rows.push(
      row(
        'total',
        {
          saleNumber: 'Total',
          paymentDate: '',
          saleDate: '',
          client: '',
          staffMembers: '',
          amount: round2(totalAmount),
          paymentMethod: '',
          saleTotal: '',
          reference: '',
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Payment Details',
        description:
          'Shows the payment details, such as payment amount and payment method, for each sale.',
        periodLabel: range.periodLabel,
        context,
      }),
      [section('details', COLUMNS, rows)],
    );
  }
}
