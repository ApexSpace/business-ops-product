import { Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type {
  ReportDataProvider,
  ReportGenerateContext,
} from '../contracts/report-provider.interface';
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
import {
  isRefundedPayment,
  refundAmountValue,
  refundedPaymentWhere,
  refundTimestamp,
} from '../utils/refunded-payments.util';

const CASH_EQUIVALENT: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.CARD,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.STRIPE,
  PaymentMethod.OTHER,
];

@Injectable()
export class CashflowProvider implements ReportDataProvider {
  readonly key = 'cashflow';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);

    const [payments, refundPayments] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          businessId,
          deletedAt: null,
          method: { in: CASH_EQUIVALENT },
          status: PaymentStatus.SUCCEEDED,
          paidAt: { gte: range.start, lte: range.end },
        },
        select: { method: true, amount: true },
      }),
      this.prisma.payment.findMany({
        where: {
          ...refundedPaymentWhere(businessId, {
            start: range.start,
            end: range.end,
          }),
          method: { in: CASH_EQUIVALENT },
        },
        select: {
          amount: true,
          status: true,
          stripeRefundId: true,
          providerMetadata: true,
          updatedAt: true,
        },
        take: 5000,
      }),
    ]);

    let gross = 0;
    let refunds = 0;
    const byMethod = new Map<string, number>();

    for (const p of payments) {
      const amt = moneyNumber(p.amount);
      gross += amt;
      byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + amt);
    }

    for (const p of refundPayments) {
      if (!isRefundedPayment(p)) continue;
      const refundedAt = refundTimestamp(p);
      if (refundedAt < range.start || refundedAt > range.end) continue;
      refunds += refundAmountValue(p);
    }

    const rows = [...byMethod.entries()].map(([method, total]) =>
      row(method, { method, total: Math.round(total * 100) / 100 }),
    );
    rows.push(
      row(
        'gross',
        { method: 'Gross', total: Math.round(gross * 100) / 100 },
        { isGroup: true },
      ),
    );
    rows.push(
      row('refunds', {
        method: 'Refunds',
        total: Math.round(refunds * 100) / 100,
      }),
    );
    rows.push(
      row(
        'net',
        {
          method: 'Net Cashflow',
          total: Math.round((gross - refunds) * 100) / 100,
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Cashflow',
        description:
          'Shows gross and net totals for cashflow. Includes cash-equivalent forms of payment; ignores non-cash payments such as gift cards and packages.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'cashflow',
          [
            { key: 'method', label: 'Type', format: 'text', align: 'left' },
            { key: 'total', label: 'Amount', format: 'money' },
          ],
          rows,
        ),
      ],
    );
  }
}
