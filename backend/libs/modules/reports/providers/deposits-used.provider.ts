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
import { closedInvoiceWhere } from '../utils/closed-invoices.util';
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
  { key: 'saleDate', label: 'Sale Date', format: 'text', align: 'left' },
  { key: 'saleNumber', label: 'Sale #', format: 'text', align: 'left' },
  { key: 'client', label: 'Client', format: 'text', align: 'left' },
  {
    key: 'depositAmount',
    label: 'Deposit Amount',
    format: 'money',
    align: 'right',
  },
];

const DESCRIPTION =
  'Shows used deposit payments, based on their associated sale date, when the sale is closed.';

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
  } | null,
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

function saleDateFromInvoice(invoice: {
  closedAt: Date | null;
  issueDate: Date;
}): Date {
  return invoice.closedAt ?? invoice.issueDate;
}

type ClosedSale = {
  id: string;
  displaySequence: number | null;
  closedAt: Date | null;
  issueDate: Date;
  appointmentId: string | null;
  contact: {
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  };
};

/**
 * Deposits Used: booking deposits counted on the closed sale date
 * (not the date the deposit was originally collected).
 */
@Injectable()
export class DepositsUsedProvider implements ReportDataProvider {
  readonly key = 'deposits_used';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';

    const closedSales: ClosedSale[] = await this.prisma.invoice.findMany({
      where: {
        ...closedInvoiceWhere(businessId, range.start, range.end),
        appointmentId: { not: null },
      },
      select: {
        id: true,
        displaySequence: true,
        closedAt: true,
        issueDate: true,
        appointmentId: true,
        contact: {
          select: { displayName: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ closedAt: 'desc' }, { issueDate: 'desc' }],
      take: 5000,
    });

    if (closedSales.length === 0) {
      return this.emptyDocument(range.periodLabel, context);
    }

    const saleIds = closedSales.map((sale) => sale.id);
    const appointmentIds = [
      ...new Set(
        closedSales
          .map((sale) => sale.appointmentId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const deposits = await this.prisma.payment.findMany({
      where: {
        businessId,
        deletedAt: null,
        payableType: PayableType.BOOKING_DEPOSIT,
        status: PaymentStatus.SUCCEEDED,
        OR: [
          { invoiceId: { in: saleIds } },
          { payableId: { in: appointmentIds } },
        ],
      },
      select: {
        id: true,
        amount: true,
        invoiceId: true,
        payableId: true,
        contact: {
          select: { displayName: true, firstName: true, lastName: true },
        },
      },
      take: 5000,
    });

    const saleById = new Map(closedSales.map((sale) => [sale.id, sale]));
    const saleByAppointment = new Map<string, ClosedSale>();
    for (const sale of closedSales) {
      if (sale.appointmentId && !saleByAppointment.has(sale.appointmentId)) {
        saleByAppointment.set(sale.appointmentId, sale);
      }
    }

    let total = 0;
    const matched: Array<{
      depositId: string;
      sale: ClosedSale;
      amount: number;
      client: string;
    }> = [];
    const seenDepositIds = new Set<string>();

    for (const deposit of deposits) {
      if (seenDepositIds.has(deposit.id)) continue;

      const sale =
        saleById.get(deposit.invoiceId) ??
        saleByAppointment.get(deposit.payableId);
      if (!sale) continue;

      seenDepositIds.add(deposit.id);
      const amount = round2(moneyNumber(deposit.amount));
      total += amount;
      matched.push({
        depositId: deposit.id,
        sale,
        amount,
        client: contactLabel(deposit.contact ?? sale.contact),
      });
    }

    matched.sort((a, b) => {
      const aTime = saleDateFromInvoice(a.sale).getTime();
      const bTime = saleDateFromInvoice(b.sale).getTime();
      if (aTime !== bTime) return bTime - aTime;
      return (b.sale.displaySequence ?? 0) - (a.sale.displaySequence ?? 0);
    });

    const rows: ReportRow[] = matched.map((entry) =>
      row(entry.depositId, {
        saleDate: formatReportDate(saleDateFromInvoice(entry.sale), timezone),
        saleNumber: resolveSaleNumber(entry.sale),
        client: entry.client,
        depositAmount: entry.amount,
      }),
    );

    rows.push(
      row(
        'total',
        {
          saleDate: 'Total',
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
        title: 'Deposits Used',
        description: DESCRIPTION,
        periodLabel: range.periodLabel,
        context,
      }),
      [section('used', COLUMNS, rows)],
    );
  }

  private emptyDocument(
    periodLabel: string,
    context: ReportGenerateContext,
  ): ReportDocument {
    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Deposits Used',
        description: DESCRIPTION,
        periodLabel,
        context,
      }),
      [
        section('used', COLUMNS, [
          row(
            'total',
            {
              saleDate: 'Total',
              saleNumber: '',
              client: '',
              depositAmount: 0,
            },
            { isTotal: true },
          ),
        ]),
      ],
    );
  }
}
