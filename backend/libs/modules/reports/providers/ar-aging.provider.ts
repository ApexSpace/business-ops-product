import { Injectable } from '@nestjs/common';
import { InvoicePaymentStatus, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

const BUCKETS = [
  { key: 'current', label: '0–30 days', min: 0, max: 30 },
  { key: '31_60', label: '31–60 days', min: 31, max: 60 },
  { key: '61_90', label: '61–90 days', min: 61, max: 90 },
  { key: 'over_90', label: '90+ days', min: 91, max: Infinity },
] as const;

@Injectable()
export class ArAgingProvider implements ReportDataProvider {
  readonly key = 'ar_aging';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const asOf = range.end;
    const invoices = await this.prisma.invoice.findMany({
      where: {
        businessId,
        deletedAt: null,
        status: { notIn: [InvoiceStatus.VOID, InvoiceStatus.PAID] },
        paymentStatus: { in: [InvoicePaymentStatus.UNPAID, InvoicePaymentStatus.PARTIALLY_PAID] },
        remainingAmount: { gt: 0 },
      },
      include: {
        contact: { select: { displayName: true, firstName: true, lastName: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 5000,
    });

    const bucketTotals = new Map<string, { count: number; amount: number }>(
      BUCKETS.map((b) => [b.key, { count: 0, amount: 0 }]),
    );
    let grandTotal = 0;
    const detailRows = invoices.map((inv) => {
      const due = inv.dueDate ?? inv.issueDate;
      const ageDays = Math.max(0, Math.floor((asOf.getTime() - due.getTime()) / 86400000));
      const bucket = BUCKETS.find((b) => ageDays >= b.min && ageDays <= b.max) ?? BUCKETS[BUCKETS.length - 1];
      const amount = moneyNumber(inv.remainingAmount);
      grandTotal += amount;
      const agg = bucketTotals.get(bucket.key)!;
      agg.count += 1;
      agg.amount += amount;
      return row(inv.id, {
        invoice: inv.invoiceNumber,
        client:
          inv.contact.displayName ||
          [inv.contact.firstName, inv.contact.lastName].filter(Boolean).join(' ') ||
          '—',
        dueDate: due.toISOString().slice(0, 10),
        ageDays,
        bucket: bucket.label,
        amount: Math.round(amount * 100) / 100,
      });
    });

    const summaryRows = BUCKETS.map((b) => {
      const agg = bucketTotals.get(b.key)!;
      return row(b.key, {
        bucket: b.label,
        count: agg.count,
        amount: Math.round(agg.amount * 100) / 100,
      });
    });
    summaryRows.push(
      row('total', { bucket: 'Total', count: invoices.length, amount: Math.round(grandTotal * 100) / 100 }, { isTotal: true }),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'AR Aging / Overdue Invoices',
        description: 'Unpaid and partially paid invoices grouped by age buckets.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'summary',
          [
            { key: 'bucket', label: 'Age Bucket', format: 'text', align: 'left' },
            { key: 'count', label: '# Invoices', format: 'int' },
            { key: 'amount', label: 'Amount Due', format: 'money' },
          ],
          summaryRows,
        ),
        section(
          'detail',
          [
            { key: 'invoice', label: 'Invoice', format: 'text', align: 'left' },
            { key: 'client', label: 'Client', format: 'text', align: 'left' },
            { key: 'dueDate', label: 'Due Date', format: 'text', align: 'left' },
            { key: 'ageDays', label: 'Age (days)', format: 'int' },
            { key: 'bucket', label: 'Bucket', format: 'text', align: 'left' },
            { key: 'amount', label: 'Amount Due', format: 'money' },
          ],
          detailRows,
          'Invoice detail',
        ),
      ],
    );
  }
}
