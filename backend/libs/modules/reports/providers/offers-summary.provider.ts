import { Injectable } from '@nestjs/common';
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
  { key: 'offer', label: 'Offer', format: 'text', align: 'left' },
  { key: 'code', label: 'Code', format: 'text', align: 'left' },
  { key: 'usedCount', label: '# used', format: 'int', align: 'right' },
  { key: 'discounts', label: 'Discounts', format: 'money', align: 'right' },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class OffersSummaryProvider implements ReportDataProvider {
  readonly key = 'offers_summary';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const logs = await this.prisma.offerUsageLog.findMany({
      where: { businessId, usedAt: { gte: range.start, lte: range.end } },
      select: {
        offerId: true,
        discountAmount: true,
        offer: {
          select: {
            name: true,
            offerCode: true,
          },
        },
      },
    });

    const byOffer = new Map<
      string,
      {
        name: string;
        code: string;
        count: number;
        discount: number;
      }
    >();

    for (const entry of logs) {
      const agg = byOffer.get(entry.offerId) ?? {
        name: entry.offer.name,
        code: entry.offer.offerCode?.trim() ?? '',
        count: 0,
        discount: 0,
      };
      agg.count += 1;
      agg.discount += moneyNumber(entry.discountAmount);
      byOffer.set(entry.offerId, agg);
    }

    let totalCount = 0;
    let totalDiscount = 0;
    const rows: ReportRow[] = [...byOffer.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((agg) => {
        totalCount += agg.count;
        totalDiscount += agg.discount;
        return row(agg.name, {
          offer: agg.name,
          code: agg.code || null,
          usedCount: agg.count,
          discounts: round2(agg.discount),
        });
      });

    rows.push(
      row(
        'total',
        {
          offer: 'Total',
          code: '',
          usedCount: totalCount,
          discounts: round2(totalDiscount),
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Offers Summary',
        description: 'Shows daily summary of the offers being used.',
        periodLabel: range.periodLabel,
        context,
      }),
      [section('summary', COLUMNS, rows)],
    );
  }
}
