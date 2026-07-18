import { Injectable } from '@nestjs/common';
import { ContactWalletTransactionType, InvoiceLineType } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';
import { loadClosedInvoicesWithItems } from '../utils/closed-invoices.util';

const DEPOSIT_TXN_TYPES: ContactWalletTransactionType[] = [
  ContactWalletTransactionType.SALE_DEPOSIT,
  ContactWalletTransactionType.MANUAL_CREDIT,
];

@Injectable()
export class ClientAccountDepositsProvider implements ReportDataProvider {
  readonly key = 'client_account_deposits';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const invoices = await loadClosedInvoicesWithItems(this.prisma, businessId, range.start, range.end);
    const rows: ReturnType<typeof row>[] = [];
    let total = 0;

    for (const inv of invoices) {
      const saleDate = (inv.closedAt ?? inv.issueDate).toISOString().slice(0, 10);
      for (const item of inv.items) {
        if (item.lineType !== InvoiceLineType.ACCOUNT_BALANCE_DEPOSIT) continue;
        const amount = moneyNumber(item.totalPrice);
        total += amount;
        rows.push(
          row(`inv-${item.id}`, {
            date: saleDate,
            source: 'Invoice',
            client: inv.contactId ?? '—',
            amount: Math.round(amount * 100) / 100,
            reference: inv.invoiceNumber,
          }),
        );
      }
    }

    const walletDeposits = await this.prisma.contactWalletTransaction.findMany({
      where: {
        businessId,
        type: { in: DEPOSIT_TXN_TYPES },
        createdAt: { gte: range.start, lte: range.end },
      },
      include: {
        contact: { select: { displayName: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    for (const t of walletDeposits) {
      const amount = moneyNumber(t.amount);
      if (amount <= 0) continue;
      total += amount;
      rows.push(
        row(t.id, {
          date: t.createdAt.toISOString().slice(0, 10),
          source: 'Wallet',
          client:
            t.contact.displayName ||
            [t.contact.firstName, t.contact.lastName].filter(Boolean).join(' ') ||
            '—',
          amount: Math.round(amount * 100) / 100,
          reference: t.type,
        }),
      );
    }

    rows.sort((a, b) => String(a.cells.date).localeCompare(String(b.cells.date)));
    rows.push(
      row('total', { date: 'Total', source: '', client: '', amount: Math.round(total * 100) / 100, reference: '' }, { isTotal: true }),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Client Account Deposits',
        description: 'Shows account balance deposit details.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'deposits',
          [
            { key: 'date', label: 'Date', format: 'text', align: 'left' },
            { key: 'source', label: 'Source', format: 'text', align: 'left' },
            { key: 'client', label: 'Client', format: 'text', align: 'left' },
            { key: 'amount', label: 'Amount', format: 'money' },
            { key: 'reference', label: 'Reference', format: 'text', align: 'left' },
          ],
          rows,
        ),
      ],
    );
  }
}
