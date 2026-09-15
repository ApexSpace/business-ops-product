import { Injectable } from '@nestjs/common';
import { AppointmentSource, AppointmentStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

const ONLINE_SOURCES: AppointmentSource[] = [
  AppointmentSource.BOOKING_WIDGET,
  AppointmentSource.PUBLIC_LINK,
  AppointmentSource.EXPRESS,
];

@Injectable()
export class BookingConversionProvider implements ReportDataProvider {
  readonly key = 'booking_conversion';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const appointments = await this.prisma.appointment.findMany({
      where: {
        businessId,
        deletedAt: null,
        source: { in: ONLINE_SOURCES },
        createdAt: { gte: range.start, lte: range.end },
      },
      select: {
        source: true,
        status: true,
        expressBookingCompletedAt: true,
        expressBookingExpiresAt: true,
      },
    });

    const bySource = new Map<
      string,
      { started: number; completed: number; expired: number; cancelled: number }
    >();
    for (const src of ONLINE_SOURCES) {
      bySource.set(src, { started: 0, completed: 0, expired: 0, cancelled: 0 });
    }

    for (const appt of appointments) {
      const agg = bySource.get(appt.source)!;
      agg.started += 1;
      if (
        appt.status === AppointmentStatus.COMPLETED ||
        appt.expressBookingCompletedAt
      ) {
        agg.completed += 1;
      }
      if (
        appt.source === AppointmentSource.EXPRESS &&
        appt.expressBookingExpiresAt &&
        !appt.expressBookingCompletedAt &&
        appt.expressBookingExpiresAt < new Date() &&
        appt.status !== AppointmentStatus.COMPLETED
      ) {
        agg.expired += 1;
      }
      if (appt.status === AppointmentStatus.CANCELLED) agg.cancelled += 1;
    }

    const rows = ONLINE_SOURCES.map((src) => {
      const agg = bySource.get(src)!;
      const rate = agg.started ? Math.round((agg.completed / agg.started) * 1000) / 10 : 0;
      return row(src, {
        source: src,
        started: agg.started,
        completed: agg.completed,
        expired: agg.expired,
        cancelled: agg.cancelled,
        conversionPct: rate,
      });
    });

    const totalStarted = appointments.length;
    const totalCompleted = appointments.filter(
      (a) => a.status === AppointmentStatus.COMPLETED || a.expressBookingCompletedAt,
    ).length;
    rows.push(
      row(
        'total',
        {
          source: 'Total',
          started: totalStarted,
          completed: totalCompleted,
          expired: rows.reduce((s, r) => s + Number(r.cells.expired), 0),
          cancelled: appointments.filter((a) => a.status === AppointmentStatus.CANCELLED).length,
          conversionPct: totalStarted
            ? Math.round((totalCompleted / totalStarted) * 1000) / 10
            : 0,
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Online / Express Booking Conversion',
        description: 'Booking links and express bookings conversion funnel.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'conversion',
          [
            { key: 'source', label: 'Source', format: 'text', align: 'left' },
            { key: 'started', label: 'Started', format: 'int' },
            { key: 'completed', label: 'Completed', format: 'int' },
            { key: 'expired', label: 'Expired', format: 'int' },
            { key: 'cancelled', label: 'Cancelled', format: 'int' },
            { key: 'conversionPct', label: 'Conversion %', format: 'int' },
          ],
          rows,
        ),
      ],
    );
  }
}
