import { Injectable } from '@nestjs/common';
import { InvoiceLineType } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';
import { loadClosedInvoicesWithItems, staffDisplayName } from '../utils/closed-invoices.util';

@Injectable()
export class BiSalesProvider implements ReportDataProvider {
  readonly key = 'bi_sales';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const invoices = await loadClosedInvoicesWithItems(this.prisma, businessId, range.start, range.end);
    type Agg = { name: string; sales: number; count: number; productSales: number };
    const map = new Map<string, Agg>();
    for (const inv of invoices) {
      for (const item of inv.items) {
        const sid = item.staffUserId ?? 'unassigned';
        const agg = map.get(sid) ?? { name: staffDisplayName(item.staffUser), sales: 0, count: 0, productSales: 0 };
        const sales = moneyNumber(item.totalPrice);
        agg.sales += sales; agg.count += 1;
        if (item.lineType === InvoiceLineType.PRODUCT) agg.productSales += sales;
        map.set(sid, agg);
      }
    }
    const rows = [...map.entries()].map(([id, a]) => row(id, { staff: a.name, avgSale: a.count ? Math.round((a.sales / a.count) * 100) / 100 : 0, avgProduct: a.count ? Math.round((a.productSales / a.count) * 100) / 100 : 0, totalSales: Math.round(a.sales * 100) / 100 }));
    return buildDocument(buildReportMeta({ reportKey: this.key, title: 'Business Intelligence: Sales', description: 'Provides insight into sales metrics such as average product total per sale for each staff member.', periodLabel: range.periodLabel, context }), [section('bi', [{ key: 'staff', label: 'Staff', format: 'text', align: 'left' }, { key: 'avgSale', label: 'Avg line total', format: 'money' }, { key: 'avgProduct', label: 'Avg product / line', format: 'money' }, { key: 'totalSales', label: 'Total Sales', format: 'money' }], rows)]);
  }
}
