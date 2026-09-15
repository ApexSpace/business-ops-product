import { Injectable } from '@nestjs/common';
import {
  ContactWalletTransactionType,
  PaymentMethod,
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

const DEPOSIT_TYPES: ContactWalletTransactionType[] = [
  ContactWalletTransactionType.SALE_DEPOSIT,
  ContactWalletTransactionType.MANUAL_CREDIT,
];

const DEPOSIT_COLUMNS: ReportColumn[] = [
  { key: 'date', label: 'Date', format: 'text', align: 'left' },
  { key: 'saleNumber', label: 'Sale #', format: 'text', align: 'left' },
  { key: 'client', label: 'Client', format: 'text', align: 'left' },
  { key: 'amount', label: 'Amount', format: 'money', align: 'right' },
];

const REFUND_COLUMNS: ReportColumn[] = [
  { key: 'date', label: 'Date', format: 'text', align: 'left' },
  { key: 'refundNumber', label: 'Refund #', format: 'text', align: 'left' },
  { key: 'client', label: 'Client', format: 'text', align: 'left' },
  { key: 'refund', label: 'Refund', format: 'money', align: 'right' },
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

function clientLabel(
  contact:
    | {
        displayName: string | null;
        firstName: string | null;
        lastName: string | null;
      }
    | null
    | undefined,
): string {
  return (
    contact?.displayName ||
    [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') ||
    '—'
  );
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

function saleDate(invoice: {
  closedAt: Date | null;
  issueDate: Date;
}): Date {
  return invoice.closedAt ?? invoice.issueDate;
}

@Injectable()
export class ClientAccountDepositsProvider implements ReportDataProvider {
  readonly key = 'client_account_deposits';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const filterRefundsBy = asString(filters.filterRefundsBy, 'sale_date');

    const depositTxns = await this.prisma.contactWalletTransaction.findMany({
      where: {
        businessId,
        type: { in: DEPOSIT_TYPES },
        amount: { gt: 0 },
        createdAt: { gte: range.start, lte: range.end },
      },
      include: {
        contact: {
          select: { displayName: true, firstName: true, lastName: true },
        },
        invoice: {
          select: { displaySequence: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    let depositTotal = 0;
    const depositRows: ReportRow[] = depositTxns.map((txn) => {
      const amount = round2(moneyNumber(txn.amount));
      depositTotal += amount;
      return row(txn.id, {
        date: formatReportDate(txn.createdAt, context.timezone),
        saleNumber:
          txn.invoice?.displaySequence != null
            ? String(txn.invoice.displaySequence)
            : '',
        client: clientLabel(txn.contact),
        amount,
      });
    });

    depositRows.push(
      row(
        'deposits-total',
        {
          date: 'Total',
          saleNumber: '',
          client: '',
          amount: round2(depositTotal),
        },
        { isTotal: true },
      ),
    );

    const refundPayments = await this.prisma.payment.findMany({
      where: {
        ...(filterRefundsBy === 'refund_date'
          ? refundedPaymentWhere(businessId, {
              start: range.start,
              end: range.end,
            })
          : refundedPaymentWhere(businessId)),
        method: PaymentMethod.WALLET,
        invoice: {
          deletedAt: null,
          walletTransactions: {
            some: { type: ContactWalletTransactionType.SALE_DEPOSIT },
          },
        },
      },
      include: {
        contact: {
          select: { displayName: true, firstName: true, lastName: true },
        },
        invoice: {
          select: {
            displaySequence: true,
            closedAt: true,
            issueDate: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });

    const walletRefundTxns = await this.prisma.contactWalletTransaction.findMany(
      {
        where: {
          businessId,
          type: ContactWalletTransactionType.REFUND,
          amount: { gt: 0 },
          ...(filterRefundsBy === 'refund_date'
            ? { createdAt: { gte: range.start, lte: range.end } }
            : {}),
        },
        include: {
          contact: {
            select: { displayName: true, firstName: true, lastName: true },
          },
          invoice: {
            select: {
              displaySequence: true,
              closedAt: true,
              issueDate: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      },
    );

    let refundTotal = 0;
    const refundRows: ReportRow[] = [];

    for (const payment of refundPayments) {
      if (!isRefundedPayment(payment) || !payment.invoice) continue;

      const refundedAt = refundTimestamp(payment);
      const sale = saleDate(payment.invoice);

      if (filterRefundsBy === 'sale_date') {
        if (sale < range.start || sale > range.end) continue;
      } else if (refundedAt < range.start || refundedAt > range.end) {
        continue;
      }

      const refund = round2(refundAmountValue(payment));
      refundTotal += refund;
      refundRows.push(
        row(`payment-${payment.id}`, {
          date: formatReportDate(refundedAt, context.timezone),
          refundNumber: buildRefundNumber(payment),
          client: clientLabel(payment.contact),
          refund,
        }),
      );
    }

    for (const txn of walletRefundTxns) {
      if (filterRefundsBy === 'sale_date' && txn.invoice) {
        const sale = saleDate(txn.invoice);
        if (sale < range.start || sale > range.end) continue;
      }

      const refund = round2(moneyNumber(txn.amount));
      refundTotal += refund;
      refundRows.push(
        row(`wallet-${txn.id}`, {
          date: formatReportDate(txn.createdAt, context.timezone),
          refundNumber: `R${shortCode(txn.id, 7)}`,
          client: clientLabel(txn.contact),
          refund,
        }),
      );
    }

    refundRows.sort((a, b) =>
      String(b.cells.date).localeCompare(String(a.cells.date)),
    );

    refundRows.push(
      row(
        'refunds-total',
        {
          date: 'Total',
          refundNumber: '',
          client: '',
          refund: round2(refundTotal),
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Client Account Balance Deposits',
        description: 'Shows the details of client account balance deposits.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section('deposits', DEPOSIT_COLUMNS, depositRows),
        section('refunds', REFUND_COLUMNS, refundRows, { title: 'Refunds' }),
      ],
    );
  }
}
