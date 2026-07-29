import { Injectable } from '@nestjs/common';
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

const COLUMNS: ReportColumn[] = [
  { key: 'saleNumber', label: 'Sale #', format: 'text', align: 'left' },
  { key: 'date', label: 'Date', format: 'text', align: 'left' },
  { key: 'client', label: 'Client', format: 'text', align: 'left' },
  { key: 'offer', label: 'Offer', format: 'text', align: 'left' },
  {
    key: 'saleTotalBefore',
    label: 'Sale Total (Before Discount)',
    format: 'money',
    align: 'right',
  },
  {
    key: 'appliedDiscount',
    label: 'Applied Discount',
    format: 'money',
    align: 'right',
  },
  {
    key: 'saleTotalAfter',
    label: 'Sale Total (After Discount)',
    format: 'money',
    align: 'right',
  },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatUsageDate(usedAt: Date, timezone: string): string {
  return DateTime.fromJSDate(usedAt)
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

@Injectable()
export class OffersUsageProvider implements ReportDataProvider {
  readonly key = 'offers_usage';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const offerId = asString(filters.offerId, '') || undefined;

    if (!offerId) {
      return this.buildReport(context, range.periodLabel, []);
    }

    const logs = await this.prisma.offerUsageLog.findMany({
      where: {
        businessId,
        offerId,
        usedAt: { gte: range.start, lte: range.end },
      },
      include: {
        offer: { select: { name: true } },
        contact: {
          select: { displayName: true, firstName: true, lastName: true },
        },
      },
      orderBy: { usedAt: 'desc' },
      take: 5000,
    });

    const saleIds = [
      ...new Set(
        logs
          .map((entry) => entry.saleId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    ];

    const sales =
      saleIds.length > 0
        ? await this.prisma.invoice.findMany({
            where: {
              businessId,
              id: { in: saleIds },
              deletedAt: null,
            },
            select: {
              id: true,
              displaySequence: true,
              totalAmount: true,
            },
          })
        : [];

    const salesById = new Map(sales.map((sale) => [sale.id, sale]));

    const rows: ReportRow[] = [];
    let totalBefore = 0;
    let totalDiscount = 0;
    let totalAfter = 0;

    for (const entry of logs) {
      const sale = entry.saleId ? salesById.get(entry.saleId) : undefined;
      const appliedDiscount = round2(moneyNumber(entry.discountAmount));
      const saleTotalAfter = sale ? round2(moneyNumber(sale.totalAmount)) : null;
      const saleTotalBefore =
        saleTotalAfter != null
          ? round2(saleTotalAfter + appliedDiscount)
          : appliedDiscount > 0
            ? appliedDiscount
            : null;

      if (saleTotalBefore != null) totalBefore += saleTotalBefore;
      totalDiscount += appliedDiscount;
      if (saleTotalAfter != null) totalAfter += saleTotalAfter;

      rows.push(
        row(entry.id, {
          saleNumber:
            sale?.displaySequence != null ? String(sale.displaySequence) : '—',
          date: formatUsageDate(entry.usedAt, context.timezone),
          client: clientLabel(entry.contact),
          offer: entry.offer.name,
          saleTotalBefore,
          appliedDiscount,
          saleTotalAfter,
        }),
      );
    }

    rows.push(
      row(
        'total',
        {
          saleNumber: 'Total',
          date: '',
          client: '',
          offer: '',
          saleTotalBefore: round2(totalBefore),
          appliedDiscount: round2(totalDiscount),
          saleTotalAfter: round2(totalAfter),
        },
        { isTotal: true },
      ),
    );

    return this.buildReport(context, range.periodLabel, rows);
  }

  private buildReport(
    context: ReportGenerateContext,
    periodLabel: string,
    rows: ReportRow[],
  ): ReportDocument {
    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Offers Usage',
        description: 'Shows the details of offer usages.',
        periodLabel,
        context,
      }),
      [section('usage', COLUMNS, rows)],
    );
  }
}
