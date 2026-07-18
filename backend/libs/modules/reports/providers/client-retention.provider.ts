import { Injectable } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class ClientRetentionProvider implements ReportDataProvider {
  readonly key = 'client_retention';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const periodAppts = await this.prisma.appointment.findMany({
      where: { businessId, deletedAt: null, status: { not: AppointmentStatus.CANCELLED }, startAt: { gte: range.start, lte: range.end }, contactId: { not: null } },
      select: { contactId: true, startAt: true },
    });
    const contactIds = [...new Set(periodAppts.map((a) => a.contactId!).filter(Boolean))];
    let retained90 = 0, retained180 = 0;
    for (const contactId of contactIds) {
      const firstInPeriod = periodAppts.filter((a) => a.contactId === contactId).sort((a,b)=>a.startAt.getTime()-b.startAt.getTime())[0];
      if (!firstInPeriod) continue;
      const later = await this.prisma.appointment.findFirst({
        where: { businessId, contactId, deletedAt: null, status: { not: AppointmentStatus.CANCELLED }, startAt: { gt: firstInPeriod.startAt } },
        select: { startAt: true }, orderBy: { startAt: 'asc' },
      });
      if (!later) continue;
      const days = (later.startAt.getTime() - firstInPeriod.startAt.getTime()) / 86400000;
      if (days <= 90) retained90++;
      if (days <= 180) retained180++;
    }
    const total = contactIds.length || 1;
    const rows = [
      row('cohort', { metric: 'Clients in period', value: contactIds.length }),
      row('r90', { metric: 'Returned within 90 days', value: retained90 }),
      row('r90p', { metric: '90-day retention %', value: Math.round((retained90 / total) * 1000) / 10 }),
      row('r180', { metric: 'Returned within 180 days', value: retained180 }),
      row('r180p', { metric: '180-day retention %', value: Math.round((retained180 / total) * 1000) / 10 }),
    ];
    return buildDocument(buildReportMeta({ reportKey: this.key, title: 'Client Retention', description: 'Specifies how many clients from the selected time period visited again within 90 or 180 days.', periodLabel: range.periodLabel, context }), [section('retention', [{ key: 'metric', label: 'Metric', format: 'text', align: 'left' }, { key: 'value', label: 'Value', format: 'int' }], rows)]);
  }
}
