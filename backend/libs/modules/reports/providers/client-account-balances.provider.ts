import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class ClientAccountBalancesProvider implements ReportDataProvider {
  readonly key = 'client_account_balances';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const balances = await this.prisma.contactWalletBalance.findMany({
      where: { businessId },
      include: {
        contact: { select: { displayName: true, firstName: true, lastName: true } },
      },
      orderBy: { balance: 'desc' },
    });
    let total = 0;
    const rows = balances
      .filter((b) => moneyNumber(b.balance) !== 0)
      .map((b) => {
        const balance = moneyNumber(b.balance);
        total += balance;
        return row(b.id, {
          client:
            b.contact.displayName ||
            [b.contact.firstName, b.contact.lastName].filter(Boolean).join(' ') ||
            '—',
          balance: Math.round(balance * 100) / 100,
          currency: b.currency,
        });
      });
    rows.push(
      row('total', { client: 'Total', balance: Math.round(total * 100) / 100, currency: '' }, { isTotal: true }),
    );
    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Client Account Balances',
        description: 'Shows current client account balances.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'balances',
          [
            { key: 'client', label: 'Client', format: 'text', align: 'left' },
            { key: 'balance', label: 'Balance', format: 'money' },
            { key: 'currency', label: 'Currency', format: 'text', align: 'left' },
          ],
          rows,
        ),
      ],
    );
  }
}
