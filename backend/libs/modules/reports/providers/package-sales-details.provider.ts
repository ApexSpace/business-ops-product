import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class PackageSalesDetailsProvider implements ReportDataProvider {
  readonly key = 'package_sales_details';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const pkgs = await this.prisma.clientPackage.findMany({
      where: { businessId, purchaseDate: { gte: range.start, lte: range.end } },
      include: {
        contact: { select: { displayName: true, firstName: true, lastName: true } },
        packageTemplate: { select: { name: true, totalPrice: true } },
        invoice: { select: { totalAmount: true } },
      },
      orderBy: { purchaseDate: 'desc' },
    });
    const rows = pkgs.map((p) =>
      row(p.id, {
        date: p.purchaseDate.toISOString().slice(0, 10),
        client:
          p.contact.displayName ||
          [p.contact.firstName, p.contact.lastName].filter(Boolean).join(' ') ||
          '—',
        package: p.packageTemplate.name,
        amount: Math.round(
          moneyNumber(p.invoice?.totalAmount ?? p.packageTemplate.totalPrice) *
            100,
        ) / 100,
      }),
    );
    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Package Sales Details',
        description: 'Shows details for each package sale.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'details',
          [
            { key: 'date', label: 'Date', format: 'text', align: 'left' },
            { key: 'client', label: 'Client', format: 'text', align: 'left' },
            { key: 'package', label: 'Package', format: 'text', align: 'left' },
            { key: 'amount', label: 'Amount', format: 'money' },
          ],
          rows,
        ),
      ],
    );
  }
}
