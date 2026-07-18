import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class PaymentSummaryProvider implements ReportDataProvider {
  readonly key = 'payment_summary';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const payments = await this.prisma.payment.findMany({
      where: { businessId, deletedAt: null, status: PaymentStatus.SUCCEEDED, paidAt: { gte: range.start, lte: range.end } },
      select: { method: true, amount: true },
    });
    const map = new Map<string, { count: number; total: number }>();
    for (const p of payments) {
      const agg = map.get(p.method) ?? { count: 0, total: 0 };
      agg.count += 1;
      agg.total += moneyNumber(p.amount);
      map.set(p.method, agg);
    }
    let count = 0, total = 0;
    const rows = [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([method, a]) => {
      count += a.count; total += a.total;
      return row(method, { method, count: a.count, total: Math.round(a.total * 100) / 100 });
    });
    rows.push(row('total', { method: 'Total', count, total: Math.round(total * 100) / 100 }, { isTotal: true }));
    return buildDocument(buildReportMeta({ reportKey: this.key, title: 'Payment Summary', description: 'Shows quantities and totals of payments by payment method.', periodLabel: range.periodLabel, context }), [section('payments', [{ key: 'method', label: 'Payment Method', format: 'text', align: 'left' }, { key: 'count', label: '# Payments', format: 'int' }, { key: 'total', label: 'Total', format: 'money' }], rows)]);
  }
}
