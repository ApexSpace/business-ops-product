import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class GiftCardSalesDetailsProvider implements ReportDataProvider {
  readonly key = 'gift_card_sales_details';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const cards = await this.prisma.giftCard.findMany({
      where: { businessId, createdAt: { gte: range.start, lte: range.end } },
      include: { promotion: { select: { name: true } }, ownerContact: { select: { displayName: true, firstName: true, lastName: true } } },
    });
    const rows = cards.map((c) => row(c.id, {
      date: c.createdAt.toISOString().slice(0,10),
      number: c.number,
      promotion: c.promotion?.name ?? '—',
      owner: c.ownerContact?.displayName || [c.ownerContact?.firstName, c.ownerContact?.lastName].filter(Boolean).join(' ') || '—',
      amount: Math.round(moneyNumber(c.initialValue)*100)/100,
    }));
    return buildDocument(buildReportMeta({ reportKey: this.key, title: 'Gift Card Sales Details', description: 'Shows details for gift card sales, such as the name of the gift card promotion.', periodLabel: range.periodLabel, context }), [section('details', [{ key: 'date', label: 'Date', format: 'text', align: 'left' }, { key: 'number', label: 'Gift Card #', format: 'text', align: 'left' }, { key: 'promotion', label: 'Promotion', format: 'text', align: 'left' }, { key: 'owner', label: 'Owner', format: 'text', align: 'left' }, { key: 'amount', label: 'Amount', format: 'money' }], rows)]);
  }
}
