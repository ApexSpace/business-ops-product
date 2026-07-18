import { Injectable } from '@nestjs/common';
import { InvoiceLineType, ProductInventoryAdjustmentType, ProductStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';
import { loadClosedInvoicesWithItems } from '../utils/closed-invoices.util';

@Injectable()
export class ProductStockUsageProvider implements ReportDataProvider {
  readonly key = 'product_stock_usage';
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
      select: { id: true, name: true, stockQuantity: true },
    });

    const soldByProduct = new Map<string, number>();
    const invoices = await loadClosedInvoicesWithItems(this.prisma, businessId, range.start, range.end);
    for (const inv of invoices) {
      for (const item of inv.items) {
        if (item.lineType !== InvoiceLineType.PRODUCT || !item.productId) continue;
        soldByProduct.set(
          item.productId,
          (soldByProduct.get(item.productId) ?? 0) + moneyNumber(item.quantity),
        );
      }
    }

    const adjustments = await this.prisma.productInventoryAdjustment.findMany({
      where: { businessId, createdAt: { gte: range.start, lte: range.end } },
      select: { productId: true, type: true, quantityChange: true, serviceId: true },
    });

    const profUseByProduct = new Map<string, number>();
    const serviceUseByProduct = new Map<string, number>();
    for (const adj of adjustments) {
      const qty = Math.abs(adj.quantityChange);
      if (adj.type === ProductInventoryAdjustmentType.PROFESSIONAL_USE) {
        profUseByProduct.set(adj.productId, (profUseByProduct.get(adj.productId) ?? 0) + qty);
      } else if (adj.type === ProductInventoryAdjustmentType.SALE) {
        soldByProduct.set(adj.productId, (soldByProduct.get(adj.productId) ?? 0) + qty);
      }
      if (adj.serviceId) {
        serviceUseByProduct.set(adj.productId, (serviceUseByProduct.get(adj.productId) ?? 0) + qty);
      }
    }

    const recipeCounts = await this.prisma.serviceProductUsage.groupBy({
      by: ['productId'],
      where: { businessId, productId: { not: null } },
      _count: { id: true },
    });
    const recipeByProduct = new Map(
      recipeCounts
        .filter((r) => r.productId)
        .map((r) => [r.productId!, r._count.id]),
    );

    const rows = products.map((p) =>
      row(p.id, {
        product: p.name,
        endStock: p.stockQuantity,
        sold: Math.round((soldByProduct.get(p.id) ?? 0) * 100) / 100,
        professionalUse: profUseByProduct.get(p.id) ?? 0,
        serviceUsage: serviceUseByProduct.get(p.id) ?? 0,
        serviceRecipes: recipeByProduct.get(p.id) ?? 0,
      }),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Product Stock & Usage',
        description:
          'Shows end stock quantities based on sold products, professional use products, and service usage.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'stock',
          [
            { key: 'product', label: 'Product', format: 'text', align: 'left' },
            { key: 'endStock', label: 'End Stock', format: 'int' },
            { key: 'sold', label: 'Sold', format: 'int' },
            { key: 'professionalUse', label: 'Prof. Use', format: 'int' },
            { key: 'serviceUsage', label: 'Service Use', format: 'int' },
            { key: 'serviceRecipes', label: 'Service Recipes', format: 'int' },
          ],
          rows,
        ),
      ],
    );
  }
}
