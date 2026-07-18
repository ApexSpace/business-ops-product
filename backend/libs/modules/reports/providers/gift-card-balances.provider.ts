import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class GiftCardBalancesProvider implements ReportDataProvider {
  readonly key = 'gift_card_balances';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const cards = await this.prisma.giftCard.findMany({
      where: { businessId },
      include: { ownerContact: { select: { displayName: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    let total = 0;
    const rows = cards.map((c) => {
      const bal = moneyNumber(c.currentBalance); total += bal;
      return row(c.id, { number: c.number, owner: c.ownerContact?.displayName || [c.ownerContact?.firstName, c.ownerContact?.lastName].filter(Boolean).join(' ') || '—', status: c.status, balance: Math.round(bal * 100) / 100 });
    });
    rows.push(row('total', { number: 'Total', owner: '', status: '', balance: Math.round(total * 100) / 100 }, { isTotal: true }));
    return buildDocument(buildReportMeta({ reportKey: this.key, title: 'Gift Card Balances', description: 'Shows outstanding gift card balances at the end of the selected day.', periodLabel: range.periodLabel, context }), [section('balances', [{ key: 'number', label: 'Gift Card #', format: 'text', align: 'left' }, { key: 'owner', label: 'Owner', format: 'text', align: 'left' }, { key: 'status', label: 'Status', format: 'text', align: 'left' }, { key: 'balance', label: 'Balance', format: 'money' }], rows)]);
  }
}
