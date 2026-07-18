import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import { DateTime } from 'luxon';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class OffersSummaryProvider implements ReportDataProvider {
  readonly key = 'offers_summary';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const logs = await this.prisma.offerUsageLog.findMany({
      where: { businessId, usedAt: { gte: range.start, lte: range.end } },
      select: { usedAt: true, discountAmount: true },
    });
    const byDay = new Map<string, { count: number; discount: number }>();
    for (const l of logs) {
      const day = DateTime.fromJSDate(l.usedAt).setZone(context.timezone).toFormat('yyyy-MM-dd');
      const agg = byDay.get(day) ?? { count: 0, discount: 0 };
      agg.count += 1;
      agg.discount += moneyNumber(l.discountAmount);
      byDay.set(day, agg);
    }
    let totalCount = 0;
    let totalDiscount = 0;
    const rows = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, agg]) => {
        totalCount += agg.count;
        totalDiscount += agg.discount;
        return row(day, {
          day,
          count: agg.count,
          discount: Math.round(agg.discount * 100) / 100,
        });
      });
    rows.push(
      row(
        'total',
        {
          day: 'Total',
          count: totalCount,
          discount: Math.round(totalDiscount * 100) / 100,
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
      [
        section(
          'summary',
          [
            { key: 'day', label: 'Day', format: 'text', align: 'left' },
            { key: 'count', label: '# Uses', format: 'int' },
            { key: 'discount', label: 'Total Discount', format: 'money' },
          ],
          rows,
        ),
      ],
    );
  }
}
