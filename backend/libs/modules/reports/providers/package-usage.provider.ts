import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type {
  ReportDataProvider,
  ReportGenerateContext,
} from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import {
  buildDocument,
  buildReportMeta,
  row,
  section,
} from '../utils/report-document.builder';

@Injectable()
export class PackageUsageProvider implements ReportDataProvider {
  readonly key = 'package_usage';

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const events = await this.prisma.packageHistoryEvent.findMany({
      where: {
        createdAt: { gte: range.start, lte: range.end },
        clientPackage: { businessId },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    const rows = events.map((e) =>
      row(e.id, {
        date: e.createdAt.toISOString().slice(0, 10),
        type: e.eventType,
        packageId: e.clientPackageId,
        note: e.description ?? '—',
      }),
    );
    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Package Usage',
        description: 'Shows package usage details.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'usage',
          [
            { key: 'date', label: 'Date', format: 'text', align: 'left' },
            { key: 'type', label: 'Event', format: 'text', align: 'left' },
            { key: 'packageId', label: 'Package', format: 'text', align: 'left' },
            { key: 'note', label: 'Note', format: 'text', align: 'left' },
          ],
          rows,
        ),
      ],
    );
  }
}
