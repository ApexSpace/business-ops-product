import { Injectable } from '@nestjs/common';
import { EstimateStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class EstimateConversionProvider implements ReportDataProvider {
  readonly key = 'estimate_conversion';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const estimates = await this.prisma.estimate.findMany({
      where: {
        businessId,
        deletedAt: null,
        issueDate: { gte: range.start, lte: range.end },
      },
      include: {
        contact: { select: { displayName: true, firstName: true, lastName: true } },
        _count: { select: { invoices: true } },
      },
      orderBy: { issueDate: 'desc' },
      take: 5000,
    });

    let total = 0;
    let sent = 0;
    let converted = 0;
    let rejected = 0;
    let totalValue = 0;
    let convertedValue = 0;

    const detailRows = estimates.map((e) => {
      total += 1;
      totalValue += moneyNumber(e.totalAmount);
      const isConverted =
        e.status === EstimateStatus.CONVERTED || e._count.invoices > 0;
      const isSent = e.status !== EstimateStatus.DRAFT;
      if (isSent) sent += 1;
      if (isConverted) {
        converted += 1;
        convertedValue += moneyNumber(e.totalAmount);
      }
      if (e.status === EstimateStatus.REJECTED) rejected += 1;
      return row(e.id, {
        date: e.issueDate.toISOString().slice(0, 10),
        number: e.estimateNumber,
        client:
          e.contact.displayName ||
          [e.contact.firstName, e.contact.lastName].filter(Boolean).join(' ') ||
          '—',
        status: e.status,
        amount: Math.round(moneyNumber(e.totalAmount) * 100) / 100,
        converted: isConverted ? 'Yes' : 'No',
      });
    });

    const winRate = sent > 0 ? Math.round((converted / sent) * 1000) / 10 : 0;
    const summaryRows = [
      row('total', { metric: 'Estimates issued', value: total }),
      row('sent', { metric: 'Sent (non-draft)', value: sent }),
      row('converted', { metric: 'Converted to invoice', value: converted }),
      row('rejected', { metric: 'Rejected', value: rejected }),
      row('winRate', { metric: 'Win rate %', value: winRate }),
      row('totalValue', { metric: 'Total estimate value', value: Math.round(totalValue * 100) / 100 }),
      row('convertedValue', { metric: 'Converted value', value: Math.round(convertedValue * 100) / 100 }),
    ];

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Estimate Conversion',
        description: 'Estimates converted to invoices and win rate.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'summary',
          [
            { key: 'metric', label: 'Metric', format: 'text', align: 'left' },
            { key: 'value', label: 'Value', format: 'int' },
          ],
          summaryRows,
        ),
        section(
          'estimates',
          [
            { key: 'date', label: 'Date', format: 'text', align: 'left' },
            { key: 'number', label: 'Estimate #', format: 'text', align: 'left' },
            { key: 'client', label: 'Client', format: 'text', align: 'left' },
            { key: 'status', label: 'Status', format: 'text', align: 'left' },
            { key: 'amount', label: 'Amount', format: 'money' },
            { key: 'converted', label: 'Converted', format: 'text', align: 'left' },
          ],
          detailRows,
          'Estimate detail',
        ),
      ],
    );
  }
}
