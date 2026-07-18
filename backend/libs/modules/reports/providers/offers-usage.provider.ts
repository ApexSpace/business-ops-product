import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { asString, moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class OffersUsageProvider implements ReportDataProvider {
  readonly key = 'offers_usage';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const offerId = asString(filters.offerId, '') || undefined;
    const logs = await this.prisma.offerUsageLog.findMany({
      where: {
        businessId,
        usedAt: { gte: range.start, lte: range.end },
        ...(offerId ? { offerId } : {}),
      },
      include: {
        offer: { select: { name: true, offerCode: true } },
        contact: { select: { displayName: true, firstName: true, lastName: true } },
      },
      orderBy: { usedAt: 'desc' },
      take: 5000,
    });
    const rows = logs.map((l) =>
      row(l.id, {
        date: l.usedAt.toISOString().slice(0, 10),
        offer: l.offer.name,
        code: l.offerCodeUsed ?? l.offer.offerCode ?? '—',
        client:
          l.contact?.displayName ||
          [l.contact?.firstName, l.contact?.lastName].filter(Boolean).join(' ') ||
          '—',
        discount: Math.round(moneyNumber(l.discountAmount) * 100) / 100,
        saleId: l.saleId ?? '—',
      }),
    );
    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Offers Usage',
        description: 'Shows the details of offer usages.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'usage',
          [
            { key: 'date', label: 'Date', format: 'text', align: 'left' },
            { key: 'offer', label: 'Offer', format: 'text', align: 'left' },
            { key: 'code', label: 'Code', format: 'text', align: 'left' },
            { key: 'client', label: 'Client', format: 'text', align: 'left' },
            { key: 'discount', label: 'Discount', format: 'money' },
            { key: 'saleId', label: 'Sale', format: 'text', align: 'left' },
          ],
          rows,
        ),
      ],
    );
  }
}
