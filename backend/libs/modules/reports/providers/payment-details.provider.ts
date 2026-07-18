import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class PaymentDetailsProvider implements ReportDataProvider {
  readonly key = 'payment_details';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const payments = await this.prisma.payment.findMany({
      where: { businessId, deletedAt: null, paidAt: { gte: range.start, lte: range.end } },
      include: { contact: { select: { displayName: true, firstName: true, lastName: true } }, invoice: { select: { invoiceNumber: true } } },
      orderBy: { paidAt: 'desc' },
      take: 5000,
    });
    const rows = payments.map((p) => row(p.id, {
      date: p.paidAt?.toISOString().slice(0, 10) ?? '',
      invoice: p.invoice?.invoiceNumber ?? '',
      contact: p.contact.displayName || [p.contact.firstName, p.contact.lastName].filter(Boolean).join(' ') || '—',
      method: p.method,
      status: p.status,
      amount: Math.round(moneyNumber(p.amount) * 100) / 100,
    }));
    const total = payments.reduce((s, p) => s + moneyNumber(p.amount), 0);
    rows.push(row('total', { date: 'Total', invoice: '', contact: '', method: '', status: '', amount: Math.round(total * 100) / 100 }, { isTotal: true }));
    return buildDocument(buildReportMeta({ reportKey: this.key, title: 'Payment Details', description: 'Shows payment details for each sale such as payment method, payment amount, and refunds.', periodLabel: range.periodLabel, context }), [section('details', [{ key: 'date', label: 'Date', format: 'text', align: 'left' }, { key: 'invoice', label: 'Invoice', format: 'text', align: 'left' }, { key: 'contact', label: 'Client', format: 'text', align: 'left' }, { key: 'method', label: 'Method', format: 'text', align: 'left' }, { key: 'status', label: 'Status', format: 'text', align: 'left' }, { key: 'amount', label: 'Amount', format: 'money' }], rows)]);
  }
}
