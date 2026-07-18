import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class PackageSalesProvider implements ReportDataProvider {
  readonly key = 'package_sales';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const pkgs = await this.prisma.clientPackage.findMany({
      where: { businessId, purchaseDate: { gte: range.start, lte: range.end } },
      include: {
        packageTemplate: { select: { name: true, totalPrice: true } },
        invoice: { select: { totalAmount: true } },
      },
    });
    const map = new Map<string, { qty: number; sales: number }>();
    for (const p of pkgs) {
      const name = p.packageTemplate.name;
      const a = map.get(name) ?? { qty: 0, sales: 0 };
      a.qty += 1;
      a.sales += moneyNumber(p.invoice?.totalAmount ?? p.packageTemplate.totalPrice);
      map.set(name, a);
    }
    let tq = 0;
    let ts = 0;
    const rows = [...map.entries()].map(([name, a]) => {
      tq += a.qty;
      ts += a.sales;
      return row(name, { package: name, qty: a.qty, sales: Math.round(a.sales * 100) / 100 });
    });
    rows.push(
      row('total', { package: 'Total', qty: tq, sales: Math.round(ts * 100) / 100 }, { isTotal: true }),
    );
    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Package Sales',
        description: 'Shows quantities and sales totals of packages.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'sales',
          [
            { key: 'package', label: 'Package', format: 'text', align: 'left' },
            { key: 'qty', label: '# Sold', format: 'int' },
            { key: 'sales', label: 'Sales', format: 'money' },
          ],
          rows,
        ),
      ],
    );
  }
}
