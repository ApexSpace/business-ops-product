import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class GiftCardUsageProvider implements ReportDataProvider {
  readonly key = 'gift_card_usage';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const rowsDb = await this.prisma.giftCardTransaction.findMany({
      where: { businessId, createdAt: { gte: range.start, lte: range.end } },
      include: { giftCard: { include: { ownerContact: { select: { displayName: true, firstName: true, lastName: true } } } } },
      orderBy: { createdAt: 'desc' }, take: 5000,
    });
    const rows = rowsDb.map((r) => row(r.id, {
      date: r.createdAt.toISOString().slice(0, 10),
      number: r.giftCard.number,
      owner: r.giftCard.ownerContact?.displayName || [r.giftCard.ownerContact?.firstName, r.giftCard.ownerContact?.lastName].filter(Boolean).join(' ') || '—',
      type: r.type,
      amount: Math.round(moneyNumber(r.amount) * 100) / 100,
    }));
    return buildDocument(buildReportMeta({ reportKey: this.key, title: 'Gift Card Usage', description: 'Shows gift card usage details, including refunded gift card payments.', periodLabel: range.periodLabel, context }), [section('usage', [{ key: 'date', label: 'Date', format: 'text', align: 'left' }, { key: 'number', label: 'Gift Card #', format: 'text', align: 'left' }, { key: 'owner', label: 'Owner', format: 'text', align: 'left' }, { key: 'type', label: 'Type', format: 'text', align: 'left' }, { key: 'amount', label: 'Amount', format: 'money' }], rows)]);
  }
}
