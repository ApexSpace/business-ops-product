import { Injectable } from '@nestjs/common';
import { PayableType, PaymentStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

/**
 * Pragmatic: invoice payments in the period where the invoice is tied to an
 * appointment that previously had a booking deposit collected.
 */
@Injectable()
export class DepositsUsedProvider implements ReportDataProvider {
  readonly key = 'deposits_used';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const depositPayments = await this.prisma.payment.findMany({
      where: {
        businessId,
        deletedAt: null,
        payableType: PayableType.BOOKING_DEPOSIT,
        status: PaymentStatus.SUCCEEDED,
      },
      select: { payableId: true, amount: true, paidAt: true },
    });
    const depositByAppointment = new Map(
      depositPayments.map((p) => [p.payableId, p]),
    );
    if (depositByAppointment.size === 0) {
      return buildDocument(
        buildReportMeta({
          reportKey: this.key,
          title: 'Deposits Used',
          description: 'Shows used deposits based on their associated sale date.',
          periodLabel: range.periodLabel,
          context,
        }),
        [
          section(
            'used',
            [
              { key: 'saleDate', label: 'Sale Date', format: 'text', align: 'left' },
              { key: 'client', label: 'Client', format: 'text', align: 'left' },
              { key: 'depositAmount', label: 'Deposit', format: 'money' },
              { key: 'paymentAmount', label: 'Applied', format: 'money' },
              { key: 'invoice', label: 'Invoice', format: 'text', align: 'left' },
            ],
            [],
          ),
        ],
      );
    }

    const appointmentIds = [...depositByAppointment.keys()];
    const invoicePayments = await this.prisma.payment.findMany({
      where: {
        businessId,
        deletedAt: null,
        payableType: PayableType.INVOICE,
        status: PaymentStatus.SUCCEEDED,
        paidAt: { gte: range.start, lte: range.end },
        invoice: { appointmentId: { in: appointmentIds }, deletedAt: null },
      },
      include: {
        contact: { select: { displayName: true, firstName: true, lastName: true } },
        invoice: { select: { invoiceNumber: true, appointmentId: true, closedAt: true, issueDate: true } },
      },
      orderBy: { paidAt: 'desc' },
      take: 5000,
    });

    let totalDeposit = 0;
    let totalApplied = 0;
    const rows = invoicePayments
      .filter((p) => p.invoice.appointmentId && depositByAppointment.has(p.invoice.appointmentId))
      .map((p) => {
        const deposit = depositByAppointment.get(p.invoice.appointmentId!)!;
        const depositAmount = moneyNumber(deposit.amount);
        const applied = moneyNumber(p.amount);
        totalDeposit += depositAmount;
        totalApplied += applied;
        const saleDate = (p.invoice.closedAt ?? p.invoice.issueDate).toISOString().slice(0, 10);
        return row(p.id, {
          saleDate,
          client:
            p.contact.displayName ||
            [p.contact.firstName, p.contact.lastName].filter(Boolean).join(' ') ||
            '—',
          depositAmount: Math.round(depositAmount * 100) / 100,
          paymentAmount: Math.round(applied * 100) / 100,
          invoice: p.invoice.invoiceNumber,
        });
      });

    rows.push(
      row(
        'total',
        {
          saleDate: 'Total',
          client: '',
          depositAmount: Math.round(totalDeposit * 100) / 100,
          paymentAmount: Math.round(totalApplied * 100) / 100,
          invoice: '',
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Deposits Used',
        description: 'Shows used deposits based on their associated sale date.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'used',
          [
            { key: 'saleDate', label: 'Sale Date', format: 'text', align: 'left' },
            { key: 'client', label: 'Client', format: 'text', align: 'left' },
            { key: 'depositAmount', label: 'Deposit', format: 'money' },
            { key: 'paymentAmount', label: 'Applied', format: 'money' },
            { key: 'invoice', label: 'Invoice', format: 'text', align: 'left' },
          ],
          rows,
        ),
      ],
    );
  }
}
