import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '@app/core/database/prisma.service';
import type {
  ReportDocument,
  ReportFilters,
} from '../contracts/report-document';
import type {
  ReportDataProvider,
  ReportGenerateContext,
} from '../contracts/report-provider.interface';
import { moneyNumber } from '../utils/report-date-range.util';
import {
  buildDocument,
  buildReportMeta,
  row,
  section,
} from '../utils/report-document.builder';

function resolveAsOfDate(filters: ReportFilters, timezone: string): DateTime {
  const raw = filters.asOfDate;
  if (typeof raw === 'string' && raw.length >= 10) {
    const parsed = DateTime.fromISO(raw, { zone: timezone });
    if (parsed.isValid) return parsed.endOf('day');
  }
  return DateTime.now().setZone(timezone).endOf('day');
}

function formatAsOfLabel(dt: DateTime): string {
  return dt.toFormat('MMMM d, yyyy');
}

function clientLabel(
  contact:
    | {
        displayName: string | null;
        firstName: string | null;
        lastName: string | null;
      }
    | null
    | undefined,
): string {
  return (
    contact?.displayName ||
    [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') ||
    '—'
  );
}

@Injectable()
export class ClientAccountBalancesProvider implements ReportDataProvider {
  readonly key = 'client_account_balances';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const asOf = resolveAsOfDate(filters, context.timezone);
    const periodLabel = `At End Of Day:  ${formatAsOfLabel(asOf)}`;
    const asOfCutoff = asOf.toUTC().toJSDate();

    const grouped = await this.prisma.contactWalletTransaction.groupBy({
      by: ['contactId'],
      where: {
        businessId,
        createdAt: { lte: asOfCutoff },
      },
      _sum: { amount: true },
    });

    const contactIds = grouped
      .map((entry) => entry.contactId)
      .filter((id): id is string => typeof id === 'string');

    const contacts =
      contactIds.length > 0
        ? await this.prisma.contact.findMany({
            where: { businessId, id: { in: contactIds } },
            select: { id: true, displayName: true, firstName: true, lastName: true },
          })
        : [];

    const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));

    let total = 0;
    const rows = grouped
      .map((entry) => {
        const balance = Math.round(moneyNumber(entry._sum.amount) * 100) / 100;
        return {
          contactId: entry.contactId,
          balance,
          contact: contactsById.get(entry.contactId),
        };
      })
      .filter((entry) => entry.balance !== 0)
      .sort((a, b) => {
        const nameA = clientLabel(a.contact);
        const nameB = clientLabel(b.contact);
        return nameA.localeCompare(nameB);
      })
      .map((entry) => {
        total += entry.balance;
        return row(entry.contactId, {
          client: clientLabel(entry.contact),
          amount: entry.balance,
        });
      });

    rows.push(
      row(
        'total',
        { client: 'Total', amount: Math.round(total * 100) / 100 },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Client Account Balances',
        description: 'Shows current account balances.',
        periodLabel,
        context,
      }),
      [
        section('balances', [
          { key: 'client', label: 'Client', format: 'text', align: 'left' },
          { key: 'amount', label: 'Amount', format: 'money', align: 'right' },
        ], rows),
      ],
    );
  }
}
