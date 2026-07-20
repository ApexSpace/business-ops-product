import { Injectable } from '@nestjs/common';
import { AppointmentStatus, DayOfWeek } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '@app/core/database/prisma.service';
import { isTimeBlockMetadata } from '@app/modules/operations/online-booking-settings/utils/gap-avoidance.util';
import type {
  ReportColumn,
  ReportDocument,
  ReportFilters,
  ReportRow,
} from '../contracts/report-document';
import type {
  ReportDataProvider,
  ReportGenerateContext,
} from '../contracts/report-provider.interface';
import {
  asBoolean,
  asStringArray,
  moneyNumber,
  resolveReportDateRange,
} from '../utils/report-date-range.util';
import {
  buildDocument,
  buildReportMeta,
  row,
  section,
} from '../utils/report-document.builder';
import { bookedHoursForAppointment } from './bi-appointments.provider';

const LUXON_TO_DAY: Record<number, DayOfWeek> = {
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
  7: DayOfWeek.SUNDAY,
};

const DESCRIPTION =
  'Provides insights into future business metrics, such as productivity and appointments booked.';

const COLUMNS: ReportColumn[] = [
  { key: 'date', label: 'Date', format: 'text', align: 'left' },
  { key: 'appointments', label: 'Appointments', format: 'int', align: 'right' },
  {
    key: 'hoursBookedPct',
    label: 'Hours Booked %',
    format: 'percent',
    align: 'right',
  },
  {
    key: 'projectedAmount',
    label: 'Projected Amount',
    format: 'money',
    align: 'right',
  },
];

type DayAgg = {
  appointments: number;
  hoursBooked: number;
  hoursAvail: number;
  projectedAmount: number;
};

function emptyDay(): DayAgg {
  return {
    appointments: 0,
    hoursBooked: 0,
    hoursAvail: 0,
    projectedAmount: 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return round2((part / whole) * 100);
}

function parseTimeHours(time: string): number {
  const [h, m] = time.split(':').map((v) => Number(v) || 0);
  return h + m / 60;
}

/** Projected revenue for an appointment from service lines or primary service. */
export function projectedAmountForAppointment(appointment: {
  serviceLines: Array<{
    price: unknown;
    service: { price: unknown } | null;
  }>;
  service: { price: unknown } | null;
}): number {
  if (appointment.serviceLines.length > 0) {
    return appointment.serviceLines.reduce((sum, line) => {
      const linePrice = moneyNumber(line.price);
      if (line.price != null && Number.isFinite(linePrice)) {
        return sum + linePrice;
      }
      return sum + moneyNumber(line.service?.price);
    }, 0);
  }
  return moneyNumber(appointment.service?.price);
}

@Injectable()
export class BiForecastProvider implements ReportDataProvider {
  readonly key = 'bi_forecast';

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';
    const onlySpecificStaff = asBoolean(filters.onlySpecificStaff, false);
    const staffFilter = onlySpecificStaff
      ? asStringArray(filters.staffIds)
      : [];
    const includePendingExpress = asBoolean(
      filters.includePendingExpressBookings,
      false,
    );

    const startLocal = DateTime.fromJSDate(range.start, { zone: 'utc' })
      .setZone(timezone)
      .startOf('day');
    const endLocal = DateTime.fromJSDate(range.end, { zone: 'utc' })
      .setZone(timezone)
      .endOf('day');

    const byDay = new Map<string, DayAgg>();
    let cursor = startLocal;
    while (cursor <= endLocal) {
      byDay.set(cursor.toFormat('yyyy-MM-dd'), emptyDay());
      cursor = cursor.plus({ days: 1 });
    }

    const schedules = await this.prisma.staffWorkSchedule.findMany({
      where: {
        businessId,
        isEnabled: true,
        ...(staffFilter.length > 0 ? { userId: { in: staffFilter } } : {}),
      },
    });

    const exceptions = await this.prisma.staffWorkException.findMany({
      where: {
        businessId,
        isUnavailable: true,
        date: {
          gte: startLocal.toJSDate(),
          lte: endLocal.toJSDate(),
        },
        ...(staffFilter.length > 0 ? { userId: { in: staffFilter } } : {}),
      },
    });
    const unavailable = new Set(
      exceptions.map(
        (entry) =>
          `${entry.userId}:${DateTime.fromJSDate(entry.date, { zone: 'utc' })
            .setZone(timezone)
            .toFormat('yyyy-MM-dd')}`,
      ),
    );

    for (const schedule of schedules) {
      const dailyHours = Math.max(
        0,
        parseTimeHours(schedule.endTime) - parseTimeHours(schedule.startTime),
      );
      let dayCursor = startLocal;
      while (dayCursor <= endLocal) {
        const dayEnum = LUXON_TO_DAY[dayCursor.weekday];
        const dateKey = dayCursor.toFormat('yyyy-MM-dd');
        if (
          dayEnum === schedule.dayOfWeek &&
          !unavailable.has(`${schedule.userId}:${dateKey}`)
        ) {
          const day = byDay.get(dateKey) ?? emptyDay();
          day.hoursAvail += dailyHours;
          byDay.set(dateKey, day);
        }
        dayCursor = dayCursor.plus({ days: 1 });
      }
    }

    const excludedStatuses: AppointmentStatus[] = [
      AppointmentStatus.CANCELLED,
      AppointmentStatus.NO_SHOW,
    ];
    if (!includePendingExpress) {
      excludedStatuses.push(AppointmentStatus.PENDING_COMPLETION);
    }

    const appointments = await this.prisma.appointment.findMany({
      where: {
        businessId,
        deletedAt: null,
        startAt: { gte: range.start, lte: range.end },
        status: { notIn: excludedStatuses },
        ...(staffFilter.length > 0
          ? { assignedToId: { in: staffFilter } }
          : {}),
      },
      select: {
        id: true,
        assignedToId: true,
        startAt: true,
        endAt: true,
        metadata: true,
        status: true,
        service: { select: { price: true } },
        serviceLines: {
          select: {
            price: true,
            assignedToId: true,
            service: { select: { price: true } },
          },
        },
      },
      take: 50000,
    });

    for (const appt of appointments) {
      if (isTimeBlockMetadata(appt.metadata)) continue;

      const dateKey = DateTime.fromJSDate(appt.startAt)
        .setZone(timezone)
        .toFormat('yyyy-MM-dd');
      const day = byDay.get(dateKey);
      if (!day) continue;

      day.appointments += 1;
      day.hoursBooked += bookedHoursForAppointment(appt, false);
      day.projectedAmount += projectedAmountForAppointment(appt);
    }

    const rows: ReportRow[] = [];
    const totals = emptyDay();

    const sortedKeys = [...byDay.keys()].sort((a, b) => a.localeCompare(b));
    for (const dateKey of sortedKeys) {
      const day = byDay.get(dateKey)!;
      const label = DateTime.fromISO(dateKey, { zone: timezone }).toFormat(
        'MMMM d',
      );
      rows.push(
        row(dateKey, {
          date: label,
          appointments: day.appointments,
          hoursBookedPct: pct(day.hoursBooked, day.hoursAvail),
          projectedAmount: round2(day.projectedAmount),
        }),
      );
      totals.appointments += day.appointments;
      totals.hoursBooked += day.hoursBooked;
      totals.hoursAvail += day.hoursAvail;
      totals.projectedAmount += day.projectedAmount;
    }

    rows.push(
      row(
        'total',
        {
          date: 'Total',
          appointments: totals.appointments,
          hoursBookedPct: pct(totals.hoursBooked, totals.hoursAvail),
          projectedAmount: round2(totals.projectedAmount),
        },
        { isTotal: true },
      ),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Business Intelligence: Forecast',
        description: DESCRIPTION,
        periodLabel: range.periodLabel,
        context,
      }),
      [section('bi-forecast', COLUMNS, rows)],
    );
  }
}
