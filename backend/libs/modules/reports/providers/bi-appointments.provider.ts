import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  DayOfWeek,
} from '@prisma/client';
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
  resolveReportDateRange,
} from '../utils/report-date-range.util';
import {
  buildDocument,
  buildReportMeta,
  row,
  section,
} from '../utils/report-document.builder';

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
  'Provides insights into appointment metrics, such as booked percentage (productivity), pre-bookings, walk-ins and staff requests.';

const FOOTNOTES = [
  'Prebooking: An appointment that has a future appointment for the same client created within 24 hours of the appointment start, or any time before the appointment start.',
  'Walk-in: An appointment that was created within 1 hour before to 1 hour after the appointment start time.',
];

const COLUMNS: ReportColumn[] = [
  { key: 'staff', label: 'Staff', format: 'text', align: 'left' },
  { key: 'hoursAvail', label: 'Hours Avail.', format: 'text', align: 'right' },
  { key: 'hoursBooked', label: 'Hours Booked', format: 'text', align: 'right' },
  { key: 'hoursBookedPct', label: 'Booked %', format: 'percent', align: 'right' },
  { key: 'allTotal', label: 'Total (All)', format: 'int', align: 'right' },
  { key: 'allRequested', label: 'Requested #', format: 'int', align: 'right' },
  {
    key: 'allRequestedPct',
    label: 'Requested %',
    format: 'percent',
    align: 'right',
  },
  { key: 'allWalkIns', label: 'Walk-ins #', format: 'int', align: 'right' },
  {
    key: 'allWalkInsPct',
    label: 'Walk-ins %',
    format: 'percent',
    align: 'right',
  },
  {
    key: 'allPrebookings',
    label: 'Prebookings #',
    format: 'int',
    align: 'right',
  },
  {
    key: 'allPrebookingsPct',
    label: 'Prebookings %',
    format: 'percent',
    align: 'right',
  },
  { key: 'newTotal', label: 'Total (New)', format: 'int', align: 'right' },
  { key: 'newRequested', label: 'Requested # (New)', format: 'int', align: 'right' },
  {
    key: 'newRequestedPct',
    label: 'Requested % (New)',
    format: 'percent',
    align: 'right',
  },
  { key: 'newWalkIns', label: 'Walk-ins # (New)', format: 'int', align: 'right' },
  {
    key: 'newWalkInsPct',
    label: 'Walk-ins % (New)',
    format: 'percent',
    align: 'right',
  },
  {
    key: 'newPrebookings',
    label: 'Prebookings # (New)',
    format: 'int',
    align: 'right',
  },
  {
    key: 'newPrebookingsPct',
    label: 'Prebookings % (New)',
    format: 'percent',
    align: 'right',
  },
];

type StaffAgg = {
  name: string;
  hoursAvail: number;
  hoursBooked: number;
  allTotal: number;
  allRequested: number;
  allWalkIns: number;
  allPrebookings: number;
  newTotal: number;
  newRequested: number;
  newWalkIns: number;
  newPrebookings: number;
};

type ApptRow = {
  id: string;
  contactId: string | null;
  assignedToId: string | null;
  startAt: Date;
  endAt: Date;
  createdAt: Date;
  metadata: unknown;
  assignedTo: { firstName: string | null; lastName: string | null } | null;
};

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

function staffName(user: {
  firstName: string | null;
  lastName: string | null;
} | null): string {
  if (!user) return 'Staff';
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Staff'
  );
}

function emptyAgg(name: string): StaffAgg {
  return {
    name,
    hoursAvail: 0,
    hoursBooked: 0,
    allTotal: 0,
    allRequested: 0,
    allWalkIns: 0,
    allPrebookings: 0,
    newTotal: 0,
    newRequested: 0,
    newWalkIns: 0,
    newPrebookings: 0,
  };
}

/** Walk-in: created within 1 hour before or after appointment start. */
export function isWalkIn(createdAt: Date, startAt: Date): boolean {
  return Math.abs(createdAt.getTime() - startAt.getTime()) <= 60 * 60 * 1000;
}

/**
 * Prebooking: has a future appointment for the same client whose create time
 * is anytime before this appointment's start, or within 24h after start.
 */
export function isPrebooking(
  appointment: { contactId: string | null; startAt: Date },
  futureByContact: Map<string, Array<{ startAt: Date; createdAt: Date }>>,
): boolean {
  if (!appointment.contactId) return false;
  const futures = futureByContact.get(appointment.contactId) ?? [];
  const windowEnd = appointment.startAt.getTime() + 24 * 60 * 60 * 1000;
  return futures.some(
    (future) =>
      future.startAt.getTime() > appointment.startAt.getTime() &&
      future.createdAt.getTime() <= windowEnd,
  );
}

/** Staff requested unless the booking explicitly used "anyone". */
export function isStaffRequested(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return true;
  }
  const row = metadata as Record<string, unknown>;
  if (row.anyone === true) return false;
  if (row.staffRequested === false) return false;
  return true;
}

function processingMinutesFromMetadata(metadata: unknown): number {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return 0;
  }
  const timing = (metadata as Record<string, unknown>).serviceTiming;
  if (!timing || typeof timing !== 'object' || Array.isArray(timing)) {
    return 0;
  }
  const segments = (timing as Record<string, unknown>).segments;
  if (!Array.isArray(segments)) return 0;
  let minutes = 0;
  for (const segment of segments) {
    if (!segment || typeof segment !== 'object') continue;
    const row = segment as Record<string, unknown>;
    if (row.type === 'PROCESSING') {
      minutes += Math.max(0, Number(row.minutes) || 0);
    }
  }
  return minutes;
}

function staffBlockedMinutesFromMetadata(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const timing = (metadata as Record<string, unknown>).serviceTiming;
  if (!timing || typeof timing !== 'object' || Array.isArray(timing)) {
    return null;
  }
  const value = (timing as Record<string, unknown>).staffBlockedMinutes;
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : null;
}

function clientOccupancyMinutesFromMetadata(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const timing = (metadata as Record<string, unknown>).serviceTiming;
  if (!timing || typeof timing !== 'object' || Array.isArray(timing)) {
    return null;
  }
  const value = (timing as Record<string, unknown>).clientOccupancyMinutes;
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : null;
}

/** Booked hours for productivity; processing optional via toggle. */
export function bookedHoursForAppointment(
  appointment: { startAt: Date; endAt: Date; metadata: unknown },
  includeProcessingTimeAsBooked: boolean,
): number {
  if (includeProcessingTimeAsBooked) {
    const occupancy = clientOccupancyMinutesFromMetadata(appointment.metadata);
    if (occupancy != null) return occupancy / 60;
    return Math.max(
      0,
      (appointment.endAt.getTime() - appointment.startAt.getTime()) / 3_600_000,
    );
  }

  const blocked = staffBlockedMinutesFromMetadata(appointment.metadata);
  if (blocked != null) return blocked / 60;

  const spanHours = Math.max(
    0,
    (appointment.endAt.getTime() - appointment.startAt.getTime()) / 3_600_000,
  );
  return Math.max(
    0,
    spanHours - processingMinutesFromMetadata(appointment.metadata) / 60,
  );
}

function cellsFromAgg(agg: StaffAgg): Record<string, string | number | null> {
  return {
    staff: agg.name,
    hoursAvail: round2(agg.hoursAvail).toFixed(2),
    hoursBooked: round2(agg.hoursBooked).toFixed(2),
    hoursBookedPct: pct(agg.hoursBooked, agg.hoursAvail),
    allTotal: agg.allTotal,
    allRequested: agg.allRequested,
    allRequestedPct: pct(agg.allRequested, agg.allTotal),
    allWalkIns: agg.allWalkIns,
    allWalkInsPct: pct(agg.allWalkIns, agg.allTotal),
    allPrebookings: agg.allPrebookings,
    allPrebookingsPct: pct(agg.allPrebookings, agg.allTotal),
    newTotal: agg.newTotal,
    newRequested: agg.newRequested,
    newRequestedPct: pct(agg.newRequested, agg.newTotal),
    newWalkIns: agg.newWalkIns,
    newWalkInsPct: pct(agg.newWalkIns, agg.newTotal),
    newPrebookings: agg.newPrebookings,
    newPrebookingsPct: pct(agg.newPrebookings, agg.newTotal),
  };
}

@Injectable()
export class BiAppointmentsProvider implements ReportDataProvider {
  readonly key = 'bi_appointments';
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    businessId: string,
    filters: ReportFilters,
    context: ReportGenerateContext,
  ): Promise<ReportDocument> {
    const range = resolveReportDateRange(filters, context.timezone);
    const timezone = context.timezone || 'UTC';
    const staffFilter = asStringArray(filters.staffIds);
    const includeProcessing = asBoolean(
      filters.includeProcessingTimeAsBooked,
      false,
    );
    const includeTimeBlocks = asBoolean(
      filters.includeTimeBlocksAsAvailable,
      false,
    );

    const startLocal = DateTime.fromJSDate(range.start, { zone: 'utc' })
      .setZone(timezone)
      .startOf('day');
    const endLocal = DateTime.fromJSDate(range.end, { zone: 'utc' })
      .setZone(timezone)
      .endOf('day');

    const schedules = await this.prisma.staffWorkSchedule.findMany({
      where: {
        businessId,
        isEnabled: true,
        ...(staffFilter.length > 0 ? { userId: { in: staffFilter } } : {}),
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
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

    const byStaff = new Map<string, StaffAgg>();

    for (const schedule of schedules) {
      const agg =
        byStaff.get(schedule.userId) ??
        emptyAgg(staffName(schedule.user));
      const dailyHours = Math.max(
        0,
        parseTimeHours(schedule.endTime) - parseTimeHours(schedule.startTime),
      );
      let cursor = startLocal;
      while (cursor <= endLocal) {
        const dayEnum = LUXON_TO_DAY[cursor.weekday];
        const dateKey = cursor.toFormat('yyyy-MM-dd');
        if (
          dayEnum === schedule.dayOfWeek &&
          !unavailable.has(`${schedule.userId}:${dateKey}`)
        ) {
          agg.hoursAvail += dailyHours;
        }
        cursor = cursor.plus({ days: 1 });
      }
      byStaff.set(schedule.userId, agg);
    }

    const appointments = (await this.prisma.appointment.findMany({
      where: {
        businessId,
        deletedAt: null,
        startAt: { gte: range.start, lte: range.end },
        status: {
          notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
        },
        ...(staffFilter.length > 0
          ? { assignedToId: { in: staffFilter } }
          : { assignedToId: { not: null } }),
      },
      select: {
        id: true,
        contactId: true,
        assignedToId: true,
        startAt: true,
        endAt: true,
        createdAt: true,
        metadata: true,
        assignedTo: { select: { firstName: true, lastName: true } },
      },
      take: 20000,
    })) as ApptRow[];

    const contactIds = [
      ...new Set(
        appointments
          .map((appt) => appt.contactId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const [priorAppointments, futureAppointments] = await Promise.all([
      contactIds.length > 0
        ? this.prisma.appointment.findMany({
            where: {
              businessId,
              deletedAt: null,
              contactId: { in: contactIds },
              startAt: { lt: range.start },
              status: {
                notIn: [
                  AppointmentStatus.CANCELLED,
                  AppointmentStatus.NO_SHOW,
                ],
              },
            },
            select: { contactId: true, startAt: true },
            take: 50000,
          })
        : Promise.resolve([]),
      contactIds.length > 0
        ? this.prisma.appointment.findMany({
            where: {
              businessId,
              deletedAt: null,
              contactId: { in: contactIds },
              startAt: { gt: range.start },
              status: {
                notIn: [
                  AppointmentStatus.CANCELLED,
                  AppointmentStatus.NO_SHOW,
                ],
              },
            },
            select: { contactId: true, startAt: true, createdAt: true },
            take: 50000,
          })
        : Promise.resolve([]),
    ]);

    const firstPriorByContact = new Map<string, Date>();
    for (const prior of priorAppointments) {
      if (!prior.contactId) continue;
      const existing = firstPriorByContact.get(prior.contactId);
      if (!existing || prior.startAt < existing) {
        firstPriorByContact.set(prior.contactId, prior.startAt);
      }
    }

    const futureByContact = new Map<
      string,
      Array<{ startAt: Date; createdAt: Date }>
    >();
    for (const future of futureAppointments) {
      if (!future.contactId) continue;
      const list = futureByContact.get(future.contactId) ?? [];
      list.push({ startAt: future.startAt, createdAt: future.createdAt });
      futureByContact.set(future.contactId, list);
    }
    for (const appt of appointments) {
      if (!appt.contactId || isTimeBlockMetadata(appt.metadata)) continue;
      const list = futureByContact.get(appt.contactId) ?? [];
      list.push({ startAt: appt.startAt, createdAt: appt.createdAt });
      futureByContact.set(appt.contactId, list);
    }

    for (const appt of appointments) {
      if (!appt.assignedToId) continue;
      const isBlock = isTimeBlockMetadata(appt.metadata);
      const agg =
        byStaff.get(appt.assignedToId) ??
        emptyAgg(staffName(appt.assignedTo));

      if (isBlock) {
        if (includeTimeBlocks) {
          const hours = Math.max(
            0,
            (appt.endAt.getTime() - appt.startAt.getTime()) / 3_600_000,
          );
          agg.hoursAvail += hours;
        }
        byStaff.set(appt.assignedToId, agg);
        continue;
      }

      agg.hoursBooked += bookedHoursForAppointment(appt, includeProcessing);

      const walkIn = isWalkIn(appt.createdAt, appt.startAt);
      const requested = isStaffRequested(appt.metadata);
      const prebooking = isPrebooking(appt, futureByContact);

      agg.allTotal += 1;
      if (requested) agg.allRequested += 1;
      if (walkIn) agg.allWalkIns += 1;
      if (prebooking) agg.allPrebookings += 1;

      byStaff.set(appt.assignedToId, agg);
    }

    // New-client metrics: first appointment ever for the contact (no prior history).
    const seenContact = new Set<string>();
    for (const appt of [...appointments].sort(
      (a, b) => a.startAt.getTime() - b.startAt.getTime(),
    )) {
      if (!appt.assignedToId || isTimeBlockMetadata(appt.metadata)) continue;
      const agg = byStaff.get(appt.assignedToId);
      if (!agg) continue;

      let isNew = false;
      if (appt.contactId) {
        const hadPrior = firstPriorByContact.has(appt.contactId);
        const seen = seenContact.has(appt.contactId);
        isNew = !hadPrior && !seen;
        seenContact.add(appt.contactId);
      }
      if (!isNew) continue;

      agg.newTotal += 1;
      if (isStaffRequested(appt.metadata)) agg.newRequested += 1;
      if (isWalkIn(appt.createdAt, appt.startAt)) agg.newWalkIns += 1;
      if (isPrebooking(appt, futureByContact)) agg.newPrebookings += 1;
    }

    const staffRows = [...byStaff.entries()]
      .map(([id, agg]) => ({ id, agg }))
      .sort((a, b) => a.agg.name.localeCompare(b.agg.name));

    const rows: ReportRow[] = staffRows.map(({ id, agg }) =>
      row(id, cellsFromAgg(agg)),
    );

    const totals = emptyAgg('All Selected');
    for (const { agg } of staffRows) {
      totals.hoursAvail += agg.hoursAvail;
      totals.hoursBooked += agg.hoursBooked;
      totals.allTotal += agg.allTotal;
      totals.allRequested += agg.allRequested;
      totals.allWalkIns += agg.allWalkIns;
      totals.allPrebookings += agg.allPrebookings;
      totals.newTotal += agg.newTotal;
      totals.newRequested += agg.newRequested;
      totals.newWalkIns += agg.newWalkIns;
      totals.newPrebookings += agg.newPrebookings;
    }
    rows.push(row('all-selected', cellsFromAgg(totals), { isTotal: true }));

    return buildDocument(
      buildReportMeta({
        reportKey: this.key,
        title: 'Business Intelligence: Appointments',
        description: DESCRIPTION,
        periodLabel: range.periodLabel,
        context,
        footnotes: FOOTNOTES,
      }),
      [section('bi-appointments', COLUMNS, rows)],
    );
  }
}
