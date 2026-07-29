import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '@app/core/database/prisma.service';
import type {
  ReportColumn,
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

const COLUMNS: ReportColumn[] = [
  { key: 'giftCardNumber', label: 'Gift Card #', format: 'text', align: 'left' },
  { key: 'purchaser', label: 'Purchaser', format: 'text', align: 'left' },
  { key: 'owner', label: 'Owner', format: 'text', align: 'left' },
  {
    key: 'purchasedFor',
    label: 'Purchased For',
    format: 'text',
    align: 'left',
  },
  { key: 'amount', label: 'Amount', format: 'money', align: 'right' },
];

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

function contactLabel(
  contact:
    | {
        displayName: string | null;
        firstName: string | null;
        lastName: string | null;
      }
    | null
    | undefined,
): string {
  if (!contact) return '';
  return (
    contact.displayName ||
    [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
    ''
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

@Injectable()
export class GiftCardBalancesProvider implements ReportDataProvider {
  readonly key = 'gift_card_balances';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const asOf = resolveAsOfDate(filters, context.timezone);
    const periodLabel = `At End Of Day:  ${formatAsOfLabel(asOf)}`;
    const asOfCutoff = asOf.toUTC().toJSDate();

    const grouped = await this.prisma.giftCardTransaction.groupBy({
      by: ['giftCardId'],
      where: {
        businessId,
        createdAt: { lte: asOfCutoff },
      },
      _sum: { amount: true },
    });

    const giftCardIds = grouped
      .map((entry) => entry.giftCardId)
      .filter((id): id is string => typeof id === 'string');

    const cards =
      giftCardIds.length > 0
        ? await this.prisma.giftCard.findMany({
            where: {
              businessId,
              id: { in: giftCardIds },
              createdAt: { lte: asOfCutoff },
            },
            include: {
              ownerContact: {
                select: {
                  displayName: true,
                  firstName: true,
                  lastName: true,
                },
              },
              purchasingContact: {
                select: {
                  displayName: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          })
        : [];

    const cardsById = new Map(cards.map((card) => [card.id, card]));

    let total = 0;
    const rows = grouped
      .map((entry) => {
        const card = cardsById.get(entry.giftCardId);
        if (!card) return null;
        const amount = round2(moneyNumber(entry._sum.amount));
        return { card, amount };
      })
      .filter(
        (entry): entry is { card: (typeof cards)[number]; amount: number } =>
          entry != null && entry.amount !== 0,
      )
      .sort((a, b) => a.card.number.localeCompare(b.card.number))
      .map((entry) => {
        total += entry.amount;
        const ownerName = contactLabel(entry.card.ownerContact);
        return row(entry.card.id, {
          giftCardNumber: entry.card.number,
          purchaser: contactLabel(entry.card.purchasingContact),
          owner: ownerName,
          // Owner is the recipient at purchase time in our model.
          purchasedFor: ownerName,
          amount: entry.amount,
        });
      });

    rows.push(
      row(
        'total',
        {
          giftCardNumber: 'Total',
          purchaser: '',
          owner: '',
          purchasedFor: '',
          amount: round2(total),
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Gift Card Balances',
        description: 'Shows outstanding gift card balances.',
        periodLabel,
        context,
      }),
      [section('balances', COLUMNS, rows)],
    );
  }
}
