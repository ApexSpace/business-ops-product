import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class ProductInventoryChangesProvider implements ReportDataProvider {
  readonly key = 'product_inventory_changes';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const adjustments = await this.prisma.productInventoryAdjustment.findMany({
      where: { businessId, createdAt: { gte: range.start, lte: range.end } },
      include: {
        product: { select: { name: true } },
        actor: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    const rows = adjustments.map((a) =>
      row(a.id, {
        date: a.createdAt.toISOString().slice(0, 10),
        product: a.product.name,
        type: a.type,
        change: a.quantityChange,
        note: a.note ?? '—',
        actor: a.actor ? [a.actor.firstName, a.actor.lastName].filter(Boolean).join(' ') || 'Staff' : '—',
      }),
    );
    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Product Inventory Changes',
        description: 'Shows product inventory changes.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'changes',
          [
            { key: 'date', label: 'Date', format: 'text', align: 'left' },
            { key: 'product', label: 'Product', format: 'text', align: 'left' },
            { key: 'type', label: 'Type', format: 'text', align: 'left' },
            { key: 'change', label: 'Qty Change', format: 'int' },
            { key: 'note', label: 'Note', format: 'text', align: 'left' },
            { key: 'actor', label: 'Staff', format: 'text', align: 'left' },
          ],
          rows,
        ),
      ],
    );
  }
}
