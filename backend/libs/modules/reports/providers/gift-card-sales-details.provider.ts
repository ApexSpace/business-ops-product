import { Injectable } from '@nestjs/common';
import {
  GiftCardSource,
  InvoiceLineType,
  InvoiceStatus,
} from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '@app/core/database/prisma.service';
import type {
  ReportColumn,
  ReportDocument,
  ReportFilters,
  ReportRow,
} from '../contracts/report-document';
import type {
  ReportDataProvider,
  ReportGenerateContext,
} from '../contracts/report-provider.interface';
import { staffDisplayName } from '../utils/closed-invoices.util';
import {
  moneyNumber,
  resolveReportDateRange,
} from '../utils/report-date-range.util';
import {
  buildDocument,
  buildReportMeta,
  row,
  section,
} from '../utils/report-document.builder';

const COLUMNS: ReportColumn[] = [
  { key: 'saleNumber', label: 'Sale #', format: 'text', align: 'left' },
  { key: 'saleDate', label: 'Sale Date', format: 'text', align: 'left' },
  { key: 'client', label: 'Client', format: 'text', align: 'left' },
  { key: 'giftCardNumber', label: 'Gift Card #', format: 'text', align: 'left' },
  { key: 'promotion', label: 'Promotion', format: 'text', align: 'left' },
  {
    key: 'giftCardValue',
    label: 'Gift Card Value',
    format: 'money',
    align: 'right',
  },
  { key: 'price', label: 'Price', format: 'money', align: 'right' },
  {
    key: 'soldByStaff',
    label: 'Sold By Staff',
    format: 'text',
    align: 'left',
  },
];

type GiftCardLine = {
  id: string;
  totalPrice: unknown;
  unitPrice: unknown;
  metadata: unknown;
  staffUser: {
    firstName: string | null;
    lastName: string | null;
  } | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatReportDate(date: Date, timezone: string): string {
  return DateTime.fromJSDate(date, { zone: 'utc' })
    .setZone(timezone || 'UTC')
    .toFormat('LLL d, yyyy');
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

function parseItemMeta(metadata: unknown): Record<string, unknown> {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata as Record<string, unknown>;
  }
  return {};
}

function saleDateFromInvoice(invoice: {
  closedAt: Date | null;
  issueDate: Date;
}): Date {
  return invoice.closedAt ?? invoice.issueDate;
}

function resolveSaleNumber(
  invoice: { displaySequence: number | null } | null | undefined,
): string {
  return invoice?.displaySequence != null
    ? String(invoice.displaySequence)
    : '';
}

function matchGiftCardLine(
  card: {
    notes: string | null;
    initialValue: unknown;
    ownerContactId: string;
  },
  lines: GiftCardLine[],
): GiftCardLine | null {
  if (lines.length === 0) return null;

  const byMarker = lines.find((line) =>
    Boolean(card.notes?.includes(`checkoutItem:${line.id}`)),
  );
  if (byMarker) return byMarker;

  const byOwner = lines.find((line) => {
    const meta = parseItemMeta(line.metadata);
    return meta.ownerContactId === card.ownerContactId;
  });
  if (byOwner) return byOwner;

  const cardValue = moneyNumber(card.initialValue);
  const byValue = lines.find((line) => {
    const meta = parseItemMeta(line.metadata);
    const lineValue =
      meta.cardValue != null
        ? moneyNumber(meta.cardValue)
        : moneyNumber(line.unitPrice);
    return Math.abs(lineValue - cardValue) < 0.005;
  });
  if (byValue) return byValue;

  return lines.length === 1 ? lines[0]! : null;
}

@Injectable()
export class GiftCardSalesDetailsProvider implements ReportDataProvider {
  readonly key = 'gift_card_sales_details';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';

    const cards = await this.prisma.giftCard.findMany({
      where: {
        businessId,
        source: {
          in: [GiftCardSource.POS_SALE, GiftCardSource.ONLINE_PURCHASE],
        },
        OR: [
          {
            invoice: {
              deletedAt: null,
              OR: [
                { closedAt: { gte: range.start, lte: range.end } },
                {
                  closedAt: null,
                  status: {
                    in: [InvoiceStatus.PAID, InvoiceStatus.PARTIAL],
                  },
                  issueDate: { gte: range.start, lte: range.end },
                },
              ],
            },
          },
          {
            invoiceId: null,
            source: GiftCardSource.ONLINE_PURCHASE,
            createdAt: { gte: range.start, lte: range.end },
          },
        ],
      },
      include: {
        promotion: { select: { name: true, salePrice: true, cardValue: true } },
        purchasingContact: {
          select: { displayName: true, firstName: true, lastName: true },
        },
        ownerContact: {
          select: { displayName: true, firstName: true, lastName: true },
        },
        invoice: {
          select: {
            displaySequence: true,
            closedAt: true,
            issueDate: true,
            contact: {
              select: { displayName: true, firstName: true, lastName: true },
            },
            closedBy: {
              select: { firstName: true, lastName: true },
            },
            items: {
              where: { lineType: InvoiceLineType.GIFT_CARD },
              select: {
                id: true,
                totalPrice: true,
                unitPrice: true,
                metadata: true,
                staffUser: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const rows: ReportRow[] = cards.map((card) => {
      const line = card.invoice
        ? matchGiftCardLine(card, card.invoice.items)
        : null;

      const saleDate = card.invoice
        ? saleDateFromInvoice(card.invoice)
        : card.createdAt;

      const giftCardValue = round2(
        moneyNumber(
          card.promotion?.cardValue ??
            (line
              ? (parseItemMeta(line.metadata).cardValue ?? card.initialValue)
              : card.initialValue),
        ),
      );

      const price = round2(
        moneyNumber(
          line?.totalPrice ??
            card.promotion?.salePrice ??
            card.initialValue,
        ),
      );

      const staffFromLine = line?.staffUser
        ? staffDisplayName(line.staffUser)
        : '';
      const staffFromCloser = card.invoice?.closedBy
        ? staffDisplayName(card.invoice.closedBy)
        : '';
      const soldByStaff =
        (staffFromLine && staffFromLine !== 'Unassigned'
          ? staffFromLine
          : '') ||
        (staffFromCloser && staffFromCloser !== 'Unassigned'
          ? staffFromCloser
          : '');

      return row(card.id, {
        saleNumber: resolveSaleNumber(card.invoice),
        saleDate: formatReportDate(saleDate, timezone),
        client:
          contactLabel(card.purchasingContact) ||
          contactLabel(card.invoice?.contact) ||
          contactLabel(card.ownerContact),
        giftCardNumber: card.number,
        promotion: card.promotion?.name ?? '',
        giftCardValue,
        price,
        soldByStaff,
      });
    });

    rows.sort((a, b) =>
      String(b.cells.saleDate).localeCompare(String(a.cells.saleDate)),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Gift Card Sales Details',
        description:
          'Shows details for gift card sales, such as the name of the gift card promotion.',
        periodLabel: range.periodLabel,
        context,
      }),
      [section('details', COLUMNS, rows)],
    );
  }
}
