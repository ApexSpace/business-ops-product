import { Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentProvider } from '@prisma/client';
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
import { resolveReportDateRange } from '../utils/report-date-range.util';
import {
  buildDocument,
  buildReportMeta,
  row,
  section,
} from '../utils/report-document.builder';
import { staffDisplayName } from '../utils/closed-invoices.util';
import {
  isRefundedPayment,
  parsePaymentMeta,
  refundAmountValue,
  refundedPaymentWhere,
  refundTimestamp,
} from '../utils/refunded-payments.util';

const COLUMNS: ReportColumn[] = [
  {
    key: 'transactionNumber',
    label: 'Transaction #',
    format: 'text',
    align: 'left',
  },
  { key: 'refundNumber', label: 'Refund #', format: 'text', align: 'left' },
  { key: 'saleNumber', label: 'Sale #', format: 'text', align: 'left' },
  {
    key: 'transactionDate',
    label: 'Transaction Date',
    format: 'text',
    align: 'left',
  },
  { key: 'client', label: 'Client', format: 'text', align: 'left' },
  { key: 'staffMember', label: 'Staff Member', format: 'text', align: 'left' },
  {
    key: 'refundMethod',
    label: 'Refund Method',
    format: 'text',
    align: 'left',
  },
  {
    key: 'paymentAccount',
    label: 'Payment Account',
    format: 'text',
    align: 'left',
  },
  { key: 'refundAmount', label: 'Refund Amount', format: 'money' },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function shortCode(id: string, length = 8): string {
  return id.replace(/-/g, '').slice(0, length).toUpperCase();
}

function formatRefundMethod(method: PaymentMethod): string {
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

function formatPaymentAccount(payment: {
  method: PaymentMethod;
  provider: PaymentProvider;
  contactPaymentMethod: {
    brand: string | null;
    last4: string | null;
  } | null;
}): string {
  const cpm = payment.contactPaymentMethod;
  if (cpm?.last4) {
    const raw = (cpm.brand ?? 'Card').trim();
    const brand = raw
      ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
      : 'Card';
    return `${brand} •••• ${cpm.last4}`;
  }
  if (payment.provider === PaymentProvider.STRIPE) {
    return 'Stripe';
  }
  switch (payment.method) {
    case PaymentMethod.CASH:
      return 'Cash';
    case PaymentMethod.WALLET:
      return 'Client Account';
    case PaymentMethod.GIFT_CARD:
      return 'Gift Card';
    case PaymentMethod.BANK_TRANSFER:
      return 'Bank Transfer';
    default:
      return formatRefundMethod(payment.method);
  }
}

function formatClientName(contact: {
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
} | null): string {
  if (!contact) return '—';
  const label =
    contact.displayName ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ');
  return label.trim() || '—';
}

function resolveStaffMember(payment: {
  createdBy: {
    firstName: string | null;
    lastName: string | null;
  } | null;
  invoice: {
    closedBy: {
      firstName: string | null;
      lastName: string | null;
    } | null;
    items: Array<{
      staffUser: {
        firstName: string | null;
        lastName: string | null;
      } | null;
    }>;
  } | null;
}): string {
  if (payment.createdBy) {
    const name = staffDisplayName(payment.createdBy);
    if (name !== 'Unassigned') return name;
  }
  if (payment.invoice?.closedBy) {
    const name = staffDisplayName(payment.invoice.closedBy);
    if (name !== 'Unassigned') return name;
  }
  for (const item of payment.invoice?.items ?? []) {
    if (item.staffUser) {
      const name = staffDisplayName(item.staffUser);
      if (name !== 'Unassigned') return name;
    }
  }
  return '—';
}

function formatTransactionDate(date: Date, timezone: string): string {
  return DateTime.fromJSDate(date, { zone: 'utc' })
    .setZone(timezone || 'UTC')
    .toFormat('LLL d, yyyy');
}

function buildTransactionNumber(payment: {
  id: string;
  reference: string | null;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
}): string {
  if (payment.reference?.trim()) return payment.reference.trim();
  if (payment.stripeChargeId) {
    return shortCode(payment.stripeChargeId, 10);
  }
  if (payment.stripePaymentIntentId) {
    return shortCode(payment.stripePaymentIntentId, 10);
  }
  return shortCode(payment.id);
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
export class RefundDetailsProvider implements ReportDataProvider {
  readonly key = 'refund_details';

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';

    const payments = await this.prisma.payment.findMany({
      where: refundedPaymentWhere(businessId, {
        start: range.start,
        end: range.end,
      }),
      select: {
        id: true,
        amount: true,
        method: true,
        provider: true,
        status: true,
        reference: true,
        stripePaymentIntentId: true,
        stripeChargeId: true,
        stripeRefundId: true,
        providerMetadata: true,
        updatedAt: true,
        contact: {
          select: {
            displayName: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: { firstName: true, lastName: true },
        },
        contactPaymentMethod: {
          select: { brand: true, last4: true },
        },
        invoice: {
          select: {
            invoiceNumber: true,
            closedBy: {
              select: { firstName: true, lastName: true },
            },
            items: {
              select: {
                staffUser: {
                  select: { firstName: true, lastName: true },
                },
              },
              take: 5,
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });

    const rows: ReportRow[] = [];
    let totalAmount = 0;

    const sorted = [...payments]
      .filter(isRefundedPayment)
      .map((payment) => ({
        payment,
        refundedAt: refundTimestamp(payment),
      }))
      .filter(
        ({ refundedAt }) =>
          refundedAt >= range.start && refundedAt <= range.end,
      )
      .sort((a, b) => b.refundedAt.getTime() - a.refundedAt.getTime());

    for (const { payment, refundedAt } of sorted) {
      const amount = refundAmountValue(payment);
      totalAmount += amount;
      rows.push(
        row(payment.id, {
          transactionNumber: buildTransactionNumber(payment),
          refundNumber: buildRefundNumber(payment),
          saleNumber: payment.invoice?.invoiceNumber ?? '—',
          transactionDate: formatTransactionDate(refundedAt, timezone),
          client: formatClientName(payment.contact),
          staffMember: resolveStaffMember(payment),
          refundMethod: formatRefundMethod(payment.method),
          paymentAccount: formatPaymentAccount(payment),
          refundAmount: round2(amount),
        }),
      );
    }

    rows.push(
      row(
        'total',
        {
          transactionNumber: 'Total',
          refundNumber: '',
          saleNumber: '',
          transactionDate: '',
          client: '',
          staffMember: '',
          refundMethod: '',
          paymentAccount: '',
          refundAmount: round2(totalAmount),
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Refund Details',
        description:
          'Shows all refund details, including refund amount and method, for each refund transaction.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section('payment-refunds', COLUMNS, rows, {
          title: 'Payment Refunds',
        }),
      ],
    );
  }
}
