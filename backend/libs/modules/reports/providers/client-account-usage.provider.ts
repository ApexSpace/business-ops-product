import { Injectable } from '@nestjs/common';
import {
  ContactWalletTransactionType,
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

const COLUMNS: ReportColumn[] = [
  { key: 'date', label: 'Date', format: 'text', align: 'left' },
  { key: 'saleNumber', label: 'Sale #', format: 'text', align: 'left' },
  { key: 'client', label: 'Client', format: 'text', align: 'left' },
  { key: 'amount', label: 'Amount', format: 'money', align: 'right' },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatUsageDate(occurredAt: Date, timezone: string): string {
  return DateTime.fromJSDate(occurredAt)
    .setZone(timezone || 'UTC')
    .toFormat('LLL d, yyyy');
}

function clientLabel(
  contact: {
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  },
): string {
  return (
    contact.displayName ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
    '—'
  );
}

function resolveSaleNumber(
  invoice: { displaySequence: number | null } | null | undefined,
): string {
  return invoice?.displaySequence != null
    ? String(invoice.displaySequence)
    : '';
}

@Injectable()
export class ClientAccountUsageProvider implements ReportDataProvider {
  readonly key = 'client_account_usage';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);

    const walletPayments = await this.prisma.payment.findMany({
      where: {
        businessId,
        method: PaymentMethod.WALLET,
        status: PaymentStatus.SUCCEEDED,
        deletedAt: null,
        OR: [
          { paidAt: { gte: range.start, lte: range.end } },
          {
            paidAt: null,
            createdAt: { gte: range.start, lte: range.end },
          },
        ],
      },
      include: {
        contact: {
          select: { displayName: true, firstName: true, lastName: true },
        },
        invoice: {
          select: { displaySequence: true },
        },
      },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      take: 5000,
    });

    const coveredPaymentIds = new Set(
      walletPayments.map((payment) => payment.id),
    );

    const orphanWalletTxnWhere =
      coveredPaymentIds.size > 0
        ? {
            OR: [
              { paymentId: null },
              { paymentId: { notIn: [...coveredPaymentIds] } },
            ],
          }
        : {};

    const walletUsageTxns = await this.prisma.contactWalletTransaction.findMany({
      where: {
        businessId,
        type: ContactWalletTransactionType.SALE_PAYMENT,
        amount: { lt: 0 },
        createdAt: { gte: range.start, lte: range.end },
        ...orphanWalletTxnWhere,
      },
      include: {
        contact: {
          select: { displayName: true, firstName: true, lastName: true },
        },
        invoice: {
          select: { displaySequence: true },
        },
        payment: {
          select: {
            invoice: {
              select: { displaySequence: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    let total = 0;
    const rows: ReportRow[] = [];

    for (const payment of walletPayments) {
      const amount = round2(moneyNumber(payment.amount));
      total += amount;
      rows.push(
        row(payment.id, {
          date: formatUsageDate(payment.paidAt ?? payment.createdAt, context.timezone),
          saleNumber: resolveSaleNumber(payment.invoice),
          client: clientLabel(payment.contact),
          amount,
        }),
      );
    }

    for (const txn of walletUsageTxns) {
      const amount = round2(Math.abs(moneyNumber(txn.amount)));
      total += amount;
      rows.push(
        row(txn.id, {
          date: formatUsageDate(txn.createdAt, context.timezone),
          saleNumber: resolveSaleNumber(
            txn.invoice ?? txn.payment?.invoice ?? null,
          ),
          client: clientLabel(txn.contact),
          amount,
        }),
      );
    }

    rows.sort((a, b) => String(b.cells.date).localeCompare(String(a.cells.date)));

    rows.push(
      row(
        'total',
        {
          date: 'Total',
          saleNumber: '',
          client: '',
          amount: round2(total),
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Client Account Balance Usage',
        description: 'Shows the details of client account balance usages.',
        periodLabel: range.periodLabel,
        context,
      }),
      [section('usage', COLUMNS, rows)],
    );
  }
}
