import { Injectable } from '@nestjs/common';
import { AppointmentSource, AppointmentStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class BiAppointmentsProvider implements ReportDataProvider {
  readonly key = 'bi_appointments';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const appts = await this.prisma.appointment.findMany({
      where: { businessId, deletedAt: null, startAt: { gte: range.start, lte: range.end } },
      select: { status: true, source: true },
    });
    const total = appts.length;
    const completed = appts.filter((a) => a.status === AppointmentStatus.COMPLETED).length;
    const cancelled = appts.filter((a) => a.status === AppointmentStatus.CANCELLED).length;
    const walkIns = appts.filter((a) => a.source === AppointmentSource.INTERNAL).length;
    const online = appts.filter((a) => a.source === AppointmentSource.BOOKING_WIDGET || a.source === AppointmentSource.PUBLIC_LINK || a.source === AppointmentSource.EXPRESS).length;
    const rows = [
      row('total', { metric: 'Total appointments', value: total }),
      row('completed', { metric: 'Completed', value: completed }),
      row('cancelled', { metric: 'Cancelled', value: cancelled }),
      row('walkin', { metric: 'Internal / walk-in source', value: walkIns }),
      row('online', { metric: 'Online / express source', value: online }),
      row('completePct', { metric: 'Completion %', value: total ? Math.round((completed / total) * 1000) / 10 : 0 }),
    ];
    return buildDocument(buildReportMeta({ reportKey: this.key, title: 'Business Intelligence: Appointments', description: 'Provides insight into appointment metrics such as booked percentage, pre-bookings, walk-ins, and staff requests.', periodLabel: range.periodLabel, context }), [section('bi', [{ key: 'metric', label: 'Metric', format: 'text', align: 'left' }, { key: 'value', label: 'Value', format: 'int' }], rows)]);
  }
}
