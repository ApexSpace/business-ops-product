import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class OutstandingPackagesProvider implements ReportDataProvider {
  readonly key = 'outstanding_packages';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const pkgs = await this.prisma.clientPackage.findMany({
      where: { businessId, status: 'ACTIVE' },
      include: {
        contact: { select: { displayName: true, firstName: true, lastName: true } },
        packageTemplate: { select: { name: true } },
        serviceAllocations: { select: { remaining: true } },
      },
      take: 5000,
    });
    const rows = pkgs.map((p) => {
      const remaining = p.serviceAllocations.reduce((s, a) => s + a.remaining, 0);
      return row(p.id, {
        client:
          p.contact.displayName ||
          [p.contact.firstName, p.contact.lastName].filter(Boolean).join(' ') ||
          '—',
        package: p.packageTemplate.name,
        status: p.status,
        remaining,
      });
    });
    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Outstanding Packages',
        description: 'Shows outstanding package credits as of today.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'outstanding',
          [
            { key: 'client', label: 'Client', format: 'text', align: 'left' },
            { key: 'package', label: 'Package', format: 'text', align: 'left' },
            { key: 'status', label: 'Status', format: 'text', align: 'left' },
            { key: 'remaining', label: 'Remaining credits', format: 'int' },
          ],
          rows,
        ),
      ],
    );
  }
}
