import { Injectable } from '@nestjs/common';
import { ContactWalletTransactionType } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

const USAGE_TYPES: ContactWalletTransactionType[] = [
  ContactWalletTransactionType.MANUAL_DEBIT,
  ContactWalletTransactionType.PAYMENT,
  ContactWalletTransactionType.SALE_PAYMENT,
];

@Injectable()
export class ClientAccountUsageProvider implements ReportDataProvider {
  readonly key = 'client_account_usage';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const txns = await this.prisma.contactWalletTransaction.findMany({
      where: {
        businessId,
        type: { in: USAGE_TYPES },
        createdAt: { gte: range.start, lte: range.end },
      },
      include: {
        contact: { select: { displayName: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    let total = 0;
    const rows = txns.map((t) => {
      const amount = Math.abs(moneyNumber(t.amount));
      total += amount;
      return row(t.id, {
        date: t.createdAt.toISOString().slice(0, 10),
        client:
          t.contact.displayName ||
          [t.contact.firstName, t.contact.lastName].filter(Boolean).join(' ') ||
          '—',
        type: t.type,
        amount: Math.round(amount * 100) / 100,
        description: t.description ?? '—',
      });
    });
    rows.push(
      row('total', { date: 'Total', client: '', type: '', amount: Math.round(total * 100) / 100, description: '' }, { isTotal: true }),
    );
    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Client Account Usage',
        description: 'Shows account balance usage details.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'usage',
          [
            { key: 'date', label: 'Date', format: 'text', align: 'left' },
            { key: 'client', label: 'Client', format: 'text', align: 'left' },
            { key: 'type', label: 'Type', format: 'text', align: 'left' },
            { key: 'amount', label: 'Amount', format: 'money' },
            { key: 'description', label: 'Description', format: 'text', align: 'left' },
          ],
          rows,
        ),
      ],
    );
  }
}
