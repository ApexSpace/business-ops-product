import { Injectable } from '@nestjs/common';
import { InvoiceLineType } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { asString, moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';
import { loadClosedInvoicesWithItems } from '../utils/closed-invoices.util';

@Injectable()
export class CostOfGoodsProvider implements ReportDataProvider {
  readonly key = 'cost_of_goods';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const groupBy = asString(filters.groupBy, 'category');
    const invoices = await loadClosedInvoicesWithItems(this.prisma, businessId, range.start, range.end);
    type Agg = { label: string; qty: number; revenue: number; cost: number };
    const map = new Map<string, Agg>();

    for (const inv of invoices) {
      for (const item of inv.items) {
        if (item.lineType !== InvoiceLineType.PRODUCT) continue;
        const purchaseCost = moneyNumber(item.product?.purchaseCost);
        if (purchaseCost <= 0) continue;
        const qty = moneyNumber(item.quantity);
        const revenue = moneyNumber(item.totalPrice);
        const cost = qty * purchaseCost;
        const key =
          groupBy === 'product'
            ? (item.productId ?? item.title)
            : (item.product?.categoryId ?? item.product?.category?.name ?? 'uncategorized');
        const label =
          groupBy === 'product'
            ? (item.product?.name ?? item.title)
            : (item.product?.category?.name ?? 'Uncategorized');
        const agg = map.get(key) ?? { label, qty: 0, revenue: 0, cost: 0 };
        agg.qty += qty;
        agg.revenue += revenue;
        agg.cost += cost;
        map.set(key, agg);
      }
    }

    let totalRevenue = 0;
    let totalCost = 0;
    const rows = [...map.entries()]
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([id, agg]) => {
        totalRevenue += agg.revenue;
        totalCost += agg.cost;
        const profit = agg.revenue - agg.cost;
        return row(id, {
          name: agg.label,
          qty: Math.round(agg.qty * 100) / 100,
          revenue: Math.round(agg.revenue * 100) / 100,
          cost: Math.round(agg.cost * 100) / 100,
          profit: Math.round(profit * 100) / 100,
        });
      });

    rows.push(
      row(
        'total',
        {
          name: 'Total',
          qty: '',
          revenue: Math.round(totalRevenue * 100) / 100,
          cost: Math.round(totalCost * 100) / 100,
          profit: Math.round((totalRevenue - totalCost) * 100) / 100,
        },
        { isTotal: true },
      ),
    );

    const nameLabel = groupBy === 'product' ? 'Product' : 'Category';
    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Cost of Goods Sold',
        description: 'Shows costs and profits of products.',
        periodLabel: range.periodLabel,
        context,
        footnotes: [
          'This report only includes products that have purchase costs associated with it.',
        ],
      }),
      [
        section(
          'cogs',
          [
            { key: 'name', label: nameLabel, format: 'text', align: 'left' },
            { key: 'qty', label: 'Qty', format: 'int' },
            { key: 'revenue', label: 'Revenue', format: 'money' },
            { key: 'cost', label: 'Cost', format: 'money' },
            { key: 'profit', label: 'Profit', format: 'money' },
          ],
          rows,
        ),
      ],
    );
  }
}
