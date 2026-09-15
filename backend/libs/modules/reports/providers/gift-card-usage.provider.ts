import { Injectable } from '@nestjs/common';
import {
  InvoiceLineType,
  PaymentMethod,
  PaymentStatus,
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
  { key: 'date', label: 'Date', format: 'text', align: 'left' },
  { key: 'saleNumber', label: 'Sale #', format: 'text', align: 'left' },
  { key: 'giftCardNumber', label: 'Gift Card #', format: 'text', align: 'left' },
  { key: 'createdDate', label: 'Created Date', format: 'text', align: 'left' },
  {
    key: 'lastSaleDate',
    label: 'Last Sale Date',
    format: 'text',
    align: 'left',
  },
  { key: 'amount', label: 'Amount', format: 'money', align: 'right' },
  {
    key: 'serviceStaffMembers',
    label: 'Service Staff Member(s)',
    format: 'text',
    align: 'left',
  },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatReportDate(date: Date, timezone: string): string {
  return DateTime.fromJSDate(date)
    .setZone(timezone || 'UTC')
    .toFormat('LLL d, yyyy');
}

function resolveSaleNumber(
  invoice: { displaySequence: number | null } | null | undefined,
): string {
  return invoice?.displaySequence != null
    ? String(invoice.displaySequence)
    : '';
}

function resolveSaleDate(
  invoice:
    | {
        closedAt: Date | null;
        issueDate: Date;
      }
    | null
    | undefined,
  fallback: Date,
): Date {
  return invoice?.closedAt ?? invoice?.issueDate ?? fallback;
}

function resolveServiceStaffMembers(
  items: Array<{
    staffUser: {
      firstName: string | null;
      lastName: string | null;
    } | null;
  }>,
): string {
  const names = new Set<string>();
  for (const item of items) {
    const name = staffDisplayName(item.staffUser);
    if (name !== 'Unassigned') {
      names.add(name);
    }
  }
  return [...names].join(', ');
}

@Injectable()
export class GiftCardUsageProvider implements ReportDataProvider {
  readonly key = 'gift_card_usage';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);

    const payments = await this.prisma.payment.findMany({
      where: {
        businessId,
        deletedAt: null,
        method: PaymentMethod.GIFT_CARD,
        status: PaymentStatus.SUCCEEDED,
        giftCardId: { not: null },
        OR: [
          { paidAt: { gte: range.start, lte: range.end } },
          {
            paidAt: null,
            createdAt: { gte: range.start, lte: range.end },
          },
        ],
      },
      include: {
        giftCard: {
          select: { id: true, number: true, createdAt: true },
        },
        invoice: {
          select: {
            displaySequence: true,
            closedAt: true,
            issueDate: true,
            items: {
              where: { lineType: InvoiceLineType.SERVICE },
              select: {
                staffUser: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      take: 5000,
    });

    const giftCardIds = [
      ...new Set(
        payments
          .map((payment) => payment.giftCardId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const lastSaleDateByGiftCardId = new Map<string, Date>();
    if (giftCardIds.length > 0) {
      const allUsagePayments = await this.prisma.payment.findMany({
        where: {
          businessId,
          deletedAt: null,
          method: PaymentMethod.GIFT_CARD,
          status: PaymentStatus.SUCCEEDED,
          giftCardId: { in: giftCardIds },
        },
        select: {
          giftCardId: true,
          paidAt: true,
          createdAt: true,
          invoice: {
            select: { closedAt: true, issueDate: true },
          },
        },
      });

      for (const usage of allUsagePayments) {
        if (!usage.giftCardId) continue;
        const occurredAt = usage.paidAt ?? usage.createdAt;
        const saleDate = resolveSaleDate(usage.invoice, occurredAt);
        const existing = lastSaleDateByGiftCardId.get(usage.giftCardId);
        if (!existing || saleDate > existing) {
          lastSaleDateByGiftCardId.set(usage.giftCardId, saleDate);
        }
      }
    }

    let total = 0;
    const rows: ReportRow[] = [];

    for (const payment of payments) {
      if (!payment.giftCard || !payment.giftCardId) continue;

      const occurredAt = payment.paidAt ?? payment.createdAt;
      const amount = round2(moneyNumber(payment.amount));
      total += amount;

      const lastSaleDate =
        lastSaleDateByGiftCardId.get(payment.giftCardId) ?? occurredAt;

      rows.push(
        row(payment.id, {
          date: formatReportDate(occurredAt, context.timezone),
          saleNumber: resolveSaleNumber(payment.invoice),
          giftCardNumber: payment.giftCard.number,
          createdDate: formatReportDate(
            payment.giftCard.createdAt,
            context.timezone,
          ),
          lastSaleDate: formatReportDate(lastSaleDate, context.timezone),
          amount,
          serviceStaffMembers: resolveServiceStaffMembers(
            payment.invoice?.items ?? [],
          ),
        }),
      );
    }

    rows.sort((a, b) => String(b.cells.date).localeCompare(String(a.cells.date)));

    rows.push(
      row(
        'total',
        {
          date: 'Total',
          saleNumber: '',
          giftCardNumber: '',
          createdDate: '',
          lastSaleDate: '',
          amount: round2(total),
          serviceStaffMembers: '',
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Gift Card Usage',
        description: 'Shows the details of gift cards usages.',
        periodLabel: range.periodLabel,
        context,
      }),
      [section('usage', COLUMNS, rows)],
    );
  }
}
