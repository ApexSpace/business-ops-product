import { Injectable } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { DateTime } from 'luxon';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class BiForecastProvider implements ReportDataProvider {
  readonly key = 'bi_forecast';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, _filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const now = DateTime.now().setZone(context.timezone);
    const end = now.plus({ days: 30 }).endOf('day').toUTC().toJSDate();
    const start = now.startOf('day').toUTC().toJSDate();
    const appts = await this.prisma.appointment.findMany({
      where: { businessId, deletedAt: null, status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] }, startAt: { gte: start, lte: end } },
      select: { startAt: true, status: true },
    });
    const byDay = new Map<string, number>();
    for (const a of appts) {
      const key = DateTime.fromJSDate(a.startAt).setZone(context.timezone).toFormat('yyyy-MM-dd');
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    const rows = [...byDay.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([day, count]) => row(day, { day, appointments: count }));
    rows.push(row('total', { day: 'Total (next 30 days)', appointments: appts.length }, { isTotal: true }));
    return buildDocument(buildReportMeta({ reportKey: this.key, title: 'Business Intelligence: Forecast', description: 'Provides insight into future business metrics such as productivity and appointments booked.', periodLabel: `${now.toFormat('MMM d, yyyy')} – ${now.plus({ days: 30 }).toFormat('MMM d, yyyy')}`, context }), [section('forecast', [{ key: 'day', label: 'Day', format: 'text', align: 'left' }, { key: 'appointments', label: 'Booked', format: 'int' }], rows)]);
  }
}
