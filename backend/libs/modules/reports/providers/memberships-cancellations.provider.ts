import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class MembershipsCancellationsProvider implements ReportDataProvider {
  readonly key = 'memberships_cancellations';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const rowsDb = await this.prisma.clientMembership.findMany({
      where: { businessId, canceledAt: { gte: range.start, lte: range.end } },
      include: { contact: { select: { displayName: true, firstName: true, lastName: true } }, plan: { select: { name: true } } },
      orderBy: { canceledAt: 'desc' },
    });
    const rows = rowsDb.map((m) => row(m.id, {
      date: m.canceledAt?.toISOString().slice(0, 10) ?? '',
      client: m.contact.displayName || [m.contact.firstName, m.contact.lastName].filter(Boolean).join(' ') || '—',
      plan: m.plan.name,
      status: m.status,
    }));
    return buildDocument(buildReportMeta({ reportKey: this.key, title: 'Memberships Cancellations', description: 'Shows canceled memberships within the selected time period.', periodLabel: range.periodLabel, context }), [section('cancellations', [{ key: 'date', label: 'Canceled', format: 'text', align: 'left' }, { key: 'client', label: 'Client', format: 'text', align: 'left' }, { key: 'plan', label: 'Plan', format: 'text', align: 'left' }, { key: 'status', label: 'Status', format: 'text', align: 'left' }], rows)]);
  }
}
