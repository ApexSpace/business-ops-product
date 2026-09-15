import { Injectable } from '@nestjs/common';
import { InvoiceLineType } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { DateTime } from 'luxon';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { asString, moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';
import { loadClosedInvoicesWithItems } from '../utils/closed-invoices.util';

@Injectable()
export class SalesByTimePeriodProvider implements ReportDataProvider {
  readonly key = 'sales_by_time_period';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const groupBy = asString(filters.groupBy, 'month');
    const invoices = await loadClosedInvoicesWithItems(this.prisma, businessId, range.start, range.end);
    type Agg = { serviceSales: number; productSales: number };
    const map = new Map<string, Agg>();
    const fmt = groupBy === 'day' ? 'yyyy-MM-dd' : groupBy === 'week' ? 'kkkk-\'W\'WW' : 'yyyy-MM';
    for (const inv of invoices) {
      const saleDate = inv.closedAt ?? inv.issueDate;
      const key = DateTime.fromJSDate(saleDate).setZone(context.timezone).toFormat(fmt);
      const agg = map.get(key) ?? { serviceSales: 0, productSales: 0 };
      for (const item of inv.items) {
        const sales = moneyNumber(item.totalPrice);
        if (item.lineType === InvoiceLineType.SERVICE) agg.serviceSales += sales;
        else if (item.lineType === InvoiceLineType.PRODUCT) agg.productSales += sales;
      }
      map.set(key, agg);
    }
    const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let ts = 0, tp = 0;
    const rows = sorted.map(([period, a]) => { ts += a.serviceSales; tp += a.productSales; return row(period, { period, serviceSales: Math.round(a.serviceSales * 100) / 100, productSales: Math.round(a.productSales * 100) / 100, total: Math.round((a.serviceSales + a.productSales) * 100) / 100 }); });
    rows.push(row('total', { period: 'Total', serviceSales: Math.round(ts * 100) / 100, productSales: Math.round(tp * 100) / 100, total: Math.round((ts + tp) * 100) / 100 }, { isTotal: true }));
    return buildDocument(buildReportMeta({ reportKey: this.key, title: 'Sales by Time Period', description: 'Shows the service and product totals by day, week or month.', periodLabel: range.periodLabel, context }), [section('periods', [{ key: 'period', label: 'Period', format: 'text', align: 'left' }, { key: 'serviceSales', label: 'Service Sales', format: 'money' }, { key: 'productSales', label: 'Product Sales', format: 'money' }, { key: 'total', label: 'Total', format: 'money' }], rows)]);
  }
}
