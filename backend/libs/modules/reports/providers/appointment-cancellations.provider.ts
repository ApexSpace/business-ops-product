import { Injectable } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

@Injectable()
export class AppointmentCancellationsProvider implements ReportDataProvider {
  readonly key = 'appointment_cancellations';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const appts = await this.prisma.appointment.findMany({
      where: { businessId, OR: [{ status: AppointmentStatus.CANCELLED, updatedAt: { gte: range.start, lte: range.end } }, { deletedAt: { gte: range.start, lte: range.end } }] },
      include: { contact: { select: { displayName: true, firstName: true, lastName: true } } },
      orderBy: { startAt: 'desc' },
      take: 5000,
    });
    const rows = appts.map((a) => row(a.id, {
      date: a.startAt.toISOString().slice(0, 10),
      client: a.contact?.displayName || [a.contact?.firstName, a.contact?.lastName].filter(Boolean).join(' ') || '—',
      status: a.deletedAt ? 'Deleted' : a.status,
      source: a.source,
      start: a.startAt.toISOString(),
    }));
    rows.push(row('total', { date: 'Total', client: String(rows.length), status: '', source: '', start: '' }, { isTotal: true }));
    return buildDocument(buildReportMeta({ reportKey: this.key, title: 'Appointment Cancellations', description: 'Shows client and appointment details for canceled appointments, deleted appointments, and expired Express Bookings.', periodLabel: range.periodLabel, context }), [section('cancellations', [{ key: 'date', label: 'Date', format: 'text', align: 'left' }, { key: 'client', label: 'Client', format: 'text', align: 'left' }, { key: 'status', label: 'Status', format: 'text', align: 'left' }, { key: 'source', label: 'Source', format: 'text', align: 'left' }, { key: 'start', label: 'Scheduled', format: 'text', align: 'left' }], rows)]);
  }
}
