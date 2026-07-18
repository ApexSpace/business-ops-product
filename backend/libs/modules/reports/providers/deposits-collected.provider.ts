import { Injectable } from '@nestjs/common';
import { PayableType, PaymentStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class DepositsCollectedProvider implements ReportDataProvider {
  readonly key = 'deposits_collected';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const payments = await this.prisma.payment.findMany({
      where: {
        businessId,
        deletedAt: null,
        payableType: PayableType.BOOKING_DEPOSIT,
        status: PaymentStatus.SUCCEEDED,
        paidAt: { gte: range.start, lte: range.end },
      },
      include: {
        contact: { select: { displayName: true, firstName: true, lastName: true } },
      },
      orderBy: { paidAt: 'desc' },
      take: 5000,
    });
    let total = 0;
    const rows = payments.map((p) => {
      const amount = moneyNumber(p.amount);
      total += amount;
      return row(p.id, {
        date: p.paidAt?.toISOString().slice(0, 10) ?? '—',
        client:
          p.contact.displayName ||
          [p.contact.firstName, p.contact.lastName].filter(Boolean).join(' ') ||
          '—',
        method: p.method,
        amount: Math.round(amount * 100) / 100,
        appointmentId: p.payableId,
      });
    });
    rows.push(
      row('total', { date: 'Total', client: '', method: '', amount: Math.round(total * 100) / 100, appointmentId: '' }, { isTotal: true }),
    );
    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Deposits Collected',
        description: 'Shows deposits collected via online booking or Express Booking.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'deposits',
          [
            { key: 'date', label: 'Date', format: 'text', align: 'left' },
            { key: 'client', label: 'Client', format: 'text', align: 'left' },
            { key: 'method', label: 'Method', format: 'text', align: 'left' },
            { key: 'amount', label: 'Amount', format: 'money' },
            { key: 'appointmentId', label: 'Appointment', format: 'text', align: 'left' },
          ],
          rows,
        ),
      ],
    );
  }
}
