import { Injectable } from '@nestjs/common';
import { PayableType, PaymentStatus } from '@prisma/client';
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
  {
    key: 'paymentDate',
    label: 'Payment Date',
    format: 'text',
    align: 'left',
  },
  { key: 'saleNumber', label: 'Sale #', format: 'text', align: 'left' },
  { key: 'client', label: 'Client', format: 'text', align: 'left' },
  {
    key: 'depositAmount',
    label: 'Deposit Amount',
    format: 'money',
    align: 'right',
  },
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
  contact: {
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  },
): string {
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

@Injectable()
export class DepositsCollectedProvider implements ReportDataProvider {
  readonly key = 'deposits_collected';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';

    const payments = await this.prisma.payment.findMany({
      where: {
        businessId,
        deletedAt: null,
        payableType: PayableType.BOOKING_DEPOSIT,
        status: PaymentStatus.SUCCEEDED,
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

    let total = 0;
    const rows: ReportRow[] = payments.map((payment) => {
      const amount = round2(moneyNumber(payment.amount));
      total += amount;
      const occurredAt = payment.paidAt ?? payment.createdAt;

      return row(payment.id, {
        paymentDate: formatReportDate(occurredAt, timezone),
        saleNumber: resolveSaleNumber(payment.invoice),
        client: contactLabel(payment.contact),
        depositAmount: amount,
      });
    });

    rows.push(
      row(
        'total',
        {
          paymentDate: 'Total',
          saleNumber: '',
          client: '',
          depositAmount: round2(total),
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Deposits Collected',
        description:
          'Shows deposit payments collected in online booking or Express Booking™.',
        periodLabel: range.periodLabel,
        context,
      }),
      [section('deposits', COLUMNS, rows)],
    );
  }
}
