import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { moneyNumber, resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class MembershipsStartedProvider implements ReportDataProvider {
  readonly key = 'memberships_started';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const rowsDb = await this.prisma.clientMembership.findMany({
      where: { businessId, startDate: { gte: range.start, lte: range.end } },
      include: { contact: { select: { displayName: true, firstName: true, lastName: true } }, plan: { select: { name: true } } },
      orderBy: { startDate: 'desc' },
    });
    const rows = rowsDb.map((m) => row(m.id, {
      date: m.startDate.toISOString().slice(0, 10),
      client: m.contact.displayName || [m.contact.firstName, m.contact.lastName].filter(Boolean).join(' ') || '—',
      plan: m.plan.name,
      price: Math.round(moneyNumber(m.price) * 100) / 100,
      status: m.status,
    }));
    return buildDocument(buildReportMeta({ reportKey: this.key, title: 'Memberships Started', description: 'Shows new memberships that were started within the selected time period.', periodLabel: range.periodLabel, context }), [section('started', [{ key: 'date', label: 'Start date', format: 'text', align: 'left' }, { key: 'client', label: 'Client', format: 'text', align: 'left' }, { key: 'plan', label: 'Plan', format: 'text', align: 'left' }, { key: 'price', label: 'Price', format: 'money' }, { key: 'status', label: 'Status', format: 'text', align: 'left' }], rows)]);
  }
}
