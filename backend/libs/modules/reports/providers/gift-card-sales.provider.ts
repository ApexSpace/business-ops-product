import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class GiftCardSalesProvider implements ReportDataProvider {
  readonly key = 'gift_card_sales';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const cards = await this.prisma.giftCard.findMany({
      where: { businessId, createdAt: { gte: range.start, lte: range.end } },
      select: { id: true, number: true, initialValue: true, createdAt: true },
    });
    let total = 0;
    const rows = cards.map((c) => { const amt = moneyNumber(c.initialValue); total += amt; return row(c.id, { date: c.createdAt.toISOString().slice(0, 10), number: c.number, amount: Math.round(amt*100)/100 }); });
    rows.push(row('total', { date: 'Total', number: String(cards.length), amount: Math.round(total*100)/100 }, { isTotal: true }));
    return buildDocument(buildReportMeta({ reportKey: this.key, title: 'Gift Card Sales', description: 'Shows quantities and sales totals of gift cards.', periodLabel: range.periodLabel, context }), [section('sales', [{ key: 'date', label: 'Date', format: 'text', align: 'left' }, { key: 'number', label: 'Gift Card #', format: 'text', align: 'left' }, { key: 'amount', label: 'Amount', format: 'money' }], rows)]);
  }
}
