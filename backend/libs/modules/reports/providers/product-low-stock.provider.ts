import { Injectable } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class ProductLowStockProvider implements ReportDataProvider {
  readonly key = 'product_low_stock';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const products = await this.prisma.product.findMany({
      where: {
        businessId,
        deletedAt: null,
        trackInventory: true,
        status: ProductStatus.ACTIVE,
        desiredQuantity: { not: null },
      },
      include: { category: { select: { name: true } } },
      orderBy: { stockQuantity: 'asc' },
    });

    const lowStock = products.filter(
      (p) => p.desiredQuantity != null && p.stockQuantity <= p.desiredQuantity,
    );

    const rows = lowStock.map((p) =>
      row(p.id, {
        product: p.name,
        category: p.category?.name ?? 'Uncategorized',
        sku: p.sku ?? '—',
        stock: p.stockQuantity,
        desired: p.desiredQuantity ?? 0,
        shortfall: (p.desiredQuantity ?? 0) - p.stockQuantity,
      }),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Product Low Stock',
        description: 'Products at or below their desired stock quantity.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'low_stock',
          [
            { key: 'product', label: 'Product', format: 'text', align: 'left' },
            { key: 'category', label: 'Category', format: 'text', align: 'left' },
            { key: 'sku', label: 'SKU', format: 'text', align: 'left' },
            { key: 'stock', label: 'Stock Qty', format: 'int' },
            { key: 'desired', label: 'Desired Qty', format: 'int' },
            { key: 'shortfall', label: 'Shortfall', format: 'int' },
          ],
          rows,
        ),
      ],
    );
  }
}
