import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '@app/core/database/prisma.service';
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
  asString,
  resolveReportDateRange,
} from '../utils/report-date-range.util';
import {
  buildDocument,
  buildReportMeta,
  row,
  section,
} from '../utils/report-document.builder';

const COLUMNS: ReportColumn[] = [
  { key: 'day', label: 'Day', format: 'text', align: 'left' },
  { key: 'staff', label: 'Staff', format: 'text', align: 'left' },
  { key: 'clockIn', label: 'Clock-In', format: 'text', align: 'left' },
  { key: 'clockOut', label: 'Clock-Out', format: 'text', align: 'left' },
  { key: 'hours', label: 'Paid Hours', format: 'text', align: 'right' },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatDay(clockIn: Date, timezone: string): string {
  return DateTime.fromJSDate(clockIn, { zone: 'utc' })
    .setZone(timezone || 'UTC')
    .toFormat('LLL d, yyyy');
}

function formatDaySortKey(clockIn: Date, timezone: string): string {
  return DateTime.fromJSDate(clockIn, { zone: 'utc' })
    .setZone(timezone || 'UTC')
    .toFormat('yyyy-MM-dd');
}

function formatClockTime(value: Date, timezone: string): string {
  return DateTime.fromJSDate(value, { zone: 'utc' })
    .setZone(timezone || 'UTC')
    .toFormat('h:mm a');
}

function formatPaidHours(hours: number): string {
  return round2(hours).toFixed(2);
}

@Injectable()
export class TimeClockProvider implements ReportDataProvider {
  readonly key = 'time_clock';

  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const sortBy = asString(filters.sortBy, 'day');
    const timezone = context.timezone || 'UTC';

    const cards = await this.prisma.timeCard.findMany({
      where: {
        businessId,
        clockInTime: { gte: range.start, lte: range.end },
      },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { clockInTime: 'asc' },
    });

    type Entry = {
      id: string;
      dayLabel: string;
      dayKey: string;
      staff: string;
      clockIn: string;
      clockOut: string;
      hours: number;
    };

    const entries: Entry[] = cards.map((card) => {
      const hours =
        card.paidMinutes != null
          ? card.paidMinutes / 60
          : card.clockOutTime
            ? (card.clockOutTime.getTime() - card.clockInTime.getTime()) /
              3_600_000
            : 0;
      const staff =
        [card.user.firstName, card.user.lastName].filter(Boolean).join(' ') ||
        'Staff';

      return {
        id: card.id,
        dayLabel: formatDay(card.clockInTime, timezone),
        dayKey: formatDaySortKey(card.clockInTime, timezone),
        staff,
        clockIn: formatClockTime(card.clockInTime, timezone),
        clockOut: card.clockOutTime
          ? formatClockTime(card.clockOutTime, timezone)
          : '—',
        hours: round2(hours),
      };
    });

    if (sortBy === 'staff') {
      entries.sort(
        (a, b) =>
          a.staff.localeCompare(b.staff) || a.dayKey.localeCompare(b.dayKey),
      );
    } else {
      entries.sort(
        (a, b) =>
          a.dayKey.localeCompare(b.dayKey) || a.staff.localeCompare(b.staff),
      );
    }

    const rows: ReportRow[] = entries.map((entry) =>
      row(entry.id, {
        day: entry.dayLabel,
        staff: entry.staff,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        hours: formatPaidHours(entry.hours),
      }),
    );

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Time Clock',
        description: 'Shows the clocked-in hours for staff members.',
        periodLabel: range.periodLabel,
        context,
      }),
      [section('timecards', COLUMNS, rows)],
    );
  }
}
