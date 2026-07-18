import { Injectable } from '@nestjs/common';
import { AppointmentStatus, DayOfWeek } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { DateTime } from 'luxon';
import type { ReportDocument, ReportFilters } from '../contracts/report-document';
import type { ReportDataProvider, ReportGenerateContext } from '../contracts/report-provider.interface';
import { resolveReportDateRange } from '../utils/report-date-range.util';
import { buildDocument, buildReportMeta, row, section } from '../utils/report-document.builder';

const LUXON_TO_DAY: Record<number, DayOfWeek> = {
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
  7: DayOfWeek.SUNDAY,
};

function parseTimeHours(time: string): number {
  const [h, m] = time.split(':').map((v) => Number(v) || 0);
  return h + m / 60;
}

@Injectable()
export class StaffUtilizationProvider implements ReportDataProvider {
  readonly key = 'staff_utilization';
  constructor(private readonly prisma: PrismaService) {}
  async generate(businessId: string, filters: ReportFilters, context: ReportGenerateContext): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const startLocal = DateTime.fromJSDate(range.start).setZone(context.timezone).startOf('day');
    const endLocal = DateTime.fromJSDate(range.end).setZone(context.timezone).endOf('day');

    const schedules = await this.prisma.staffWorkSchedule.findMany({
      where: { businessId, isEnabled: true },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    const exceptions = await this.prisma.staffWorkException.findMany({
      where: {
        businessId,
        date: {
          gte: startLocal.toJSDate(),
          lte: endLocal.toJSDate(),
        },
        isUnavailable: true,
      },
    });
    const unavailableByUserDate = new Set(
      exceptions.map((e) => `${e.userId}:${e.date.toISOString().slice(0, 10)}`),
    );

    const availableByUser = new Map<string, { name: string; hours: number }>();
    for (const schedule of schedules) {
      const name =
        [schedule.user.firstName, schedule.user.lastName].filter(Boolean).join(' ') || 'Staff';
      const dailyHours = Math.max(0, parseTimeHours(schedule.endTime) - parseTimeHours(schedule.startTime));
      let cursor = startLocal;
      let totalHours = 0;
      while (cursor <= endLocal) {
        const dayEnum = LUXON_TO_DAY[cursor.weekday];
        const dateKey = cursor.toFormat('yyyy-MM-dd');
        if (
          dayEnum === schedule.dayOfWeek &&
          !unavailableByUserDate.has(`${schedule.userId}:${dateKey}`)
        ) {
          totalHours += dailyHours;
        }
        cursor = cursor.plus({ days: 1 });
      }
      const agg = availableByUser.get(schedule.userId) ?? { name, hours: 0 };
      agg.hours += totalHours;
      availableByUser.set(schedule.userId, agg);
    }

    const appointments = await this.prisma.appointment.findMany({
      where: {
        businessId,
        deletedAt: null,
        assignedToId: { not: null },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
        startAt: { gte: range.start, lte: range.end },
      },
      select: { assignedToId: true, startAt: true, endAt: true, assignedTo: { select: { firstName: true, lastName: true } } },
    });

    const bookedByUser = new Map<string, { name: string; hours: number }>();
    for (const appt of appointments) {
      if (!appt.assignedToId) continue;
      const hours = (appt.endAt.getTime() - appt.startAt.getTime()) / 3600000;
      const name =
        [appt.assignedTo?.firstName, appt.assignedTo?.lastName].filter(Boolean).join(' ') ||
        'Staff';
      const agg = bookedByUser.get(appt.assignedToId) ?? { name, hours: 0 };
      agg.hours += hours;
      bookedByUser.set(appt.assignedToId, agg);
    }

    const staffIds = new Set([...availableByUser.keys(), ...bookedByUser.keys()]);
    const rows = [...staffIds].map((id) => {
      const available = availableByUser.get(id)?.hours ?? 0;
      const booked = bookedByUser.get(id)?.hours ?? 0;
      const name = availableByUser.get(id)?.name ?? bookedByUser.get(id)?.name ?? 'Staff';
      const utilization = available > 0 ? Math.round((booked / available) * 1000) / 10 : 0;
      return row(id, {
        staff: name,
        bookedHours: Math.round(booked * 100) / 100,
        availableHours: Math.round(available * 100) / 100,
        utilizationPct: utilization,
      });
    });
    rows.sort((a, b) => Number(b.cells.utilizationPct) - Number(a.cells.utilizationPct));

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Staff Utilization',
        description: 'Booked appointment hours vs available calendar hours.',
        periodLabel: range.periodLabel,
        context,
      }),
      [
        section(
          'utilization',
          [
            { key: 'staff', label: 'Staff', format: 'text', align: 'left' },
            { key: 'bookedHours', label: 'Booked Hours', format: 'int' },
            { key: 'availableHours', label: 'Available Hours', format: 'int' },
            { key: 'utilizationPct', label: 'Utilization %', format: 'int' },
          ],
          rows,
        ),
      ],
    );
  }
}
