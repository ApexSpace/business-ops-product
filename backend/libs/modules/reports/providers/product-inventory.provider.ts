import { Injectable } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class ProductInventoryProvider implements ReportDataProvider {
  readonly key = 'product_inventory';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const products = await this.prisma.product.findMany({
      where: {
        businessId,
        deletedAt: null,
        trackInventory: true,
        status: ProductStatus.ACTIVE,
      },
      include: { category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
    let totalStock = 0;
    const rows = products.map((p) => {
      totalStock += p.stockQuantity;
      return row(p.id, {
        product: p.name,
        category: p.category?.name ?? 'Uncategorized',
        sku: p.sku ?? '—',
        stock: p.stockQuantity,
        desired: p.desiredQuantity ?? '—',
      });
    });
    rows.push(
      row('total', { product: 'Total', category: '', sku: '', stock: totalStock, desired: '' }, { isTotal: true }),
    );
    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Product Inventory',
        description: 'Shows the stock of products at the end of the selected day.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'inventory',
          [
            { key: 'product', label: 'Product', format: 'text', align: 'left' },
            { key: 'category', label: 'Category', format: 'text', align: 'left' },
            { key: 'sku', label: 'SKU', format: 'text', align: 'left' },
            { key: 'stock', label: 'Stock Qty', format: 'int' },
            { key: 'desired', label: 'Desired Qty', format: 'int' },
          ],
          rows,
        ),
      ],
    );
  }
}
