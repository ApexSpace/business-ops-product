import { DateTime } from 'luxon';
import type { PublicBookingTimingContext } from '@app/modules/crm/services/services/service-booking-timing.service';
import {
  getWorkingWindowForDay,
  type WeeklyHoursSlot,
} from '@app/modules/operations/online-booking-settings/utils/effective-working-hours.util';
import {
  resolveGapAvoidancePolicy,
  slotPassesGapAvoidanceForStaffIds,
} from '@app/modules/operations/online-booking-settings/utils/gap-avoidance.util';
import { countClientOccupancyOverlaps } from '@app/modules/operations/appointments/utils/appointment-blocking.util';
import { DayOfWeek } from '@prisma/client';
import {
  resolveEffectiveBuffers,
  type BufferFallback,
} from '@app/modules/operations/scheduling-settings/utils/scheduling-behavior.util';

const LUXON_WEEKDAY_TO_DAY: Record<number, DayOfWeek> = {
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
  7: 'SUNDAY',
};

export type ChainedBookingLineInput = {
  serviceId: string;
  staffId?: string;
  anyone?: boolean;
  eligibleStaffIds?: string[];
  timing: PublicBookingTimingContext | null;
  weeklyHours?: WeeklyHoursSlot[];
};

export type ResolvedChainedSegment = {
  serviceId: string;
  staffId: string;
  startAt: Date;
  endAt: Date;
  clientOccupancyMinutes: number;
};

type BlockingAppointment = {
  startAt: Date;
  endAt: Date;
  assignedToId: string | null;
  serviceLines?: Array<{ assignedToId: string | null }>;
};

function appointmentAssignedToStaff(
  appointment: {
    assignedToId: string | null;
    serviceLines?: Array<{ assignedToId: string | null }>;
  },
  staffId: string,
): boolean {
  if (appointment.assignedToId === staffId) return true;
  return (
    appointment.serviceLines?.some((line) => line.assignedToId === staffId) ??
    false
  );
}

function staffAppointments(
  appointments: BlockingAppointment[],
  staffId: string,
): BlockingAppointment[] {
  return appointments.filter((appointment) =>
    appointmentAssignedToStaff(appointment, staffId),
  );
}

function segmentHasOverlap(
  appointments: BlockingAppointment[],
  staffId: string,
  startUtc: Date,
  endUtc: Date,
): boolean {
  return (
    countClientOccupancyOverlaps(staffAppointments(appointments, staffId), {
      startAt: startUtc,
      endAt: endUtc,
    }) > 0
  );
}

function segmentPassesGapRules(params: {
  staffId: string;
  segmentStartMin: number;
  segmentEndMin: number;
  shiftStartMin: number;
  shiftEndMin: number;
  clientOccupancyMinutes: number;
  slotIntervalMin: number;
  dayAppointments: BlockingAppointment[];
  tz: string;
  fallbackBuffers: { bufferBeforeMinutes: number; bufferAfterMinutes: number };
  gapPolicy: ReturnType<typeof resolveGapAvoidancePolicy>;
  allowMultipleServices?: boolean;
}): boolean {
  return slotPassesGapAvoidanceForStaffIds({
    slotStartMin: params.segmentStartMin,
    slotEndMin: params.segmentEndMin,
    shiftStartMin: params.shiftStartMin,
    shiftEndMin: params.shiftEndMin,
    slotDurationMin: params.clientOccupancyMinutes,
    slotIntervalMin: params.slotIntervalMin,
    staffIds: [params.staffId],
    appointments: params.dayAppointments,
    tz: params.tz,
    fallbackBuffers: params.fallbackBuffers,
    policy: params.gapPolicy,
    allowMultipleServices: params.allowMultipleServices,
  });
}

function resolveLineOccupancy(timing: PublicBookingTimingContext | null): number {
  return timing?.clientOccupancyMinutes ?? 30;
}

function resolveLineBuffers(
  timing: PublicBookingTimingContext | null,
  scheduling: {
    bufferTimeEnabled: boolean;
    businessFallback: BufferFallback;
  },
) {
  return resolveEffectiveBuffers({
    bufferTimeEnabled: scheduling.bufferTimeEnabled,
    timing,
    businessFallback: scheduling.businessFallback,
  });
}

function segmentWithinWorkingHours(params: {
  weeklyHours?: WeeklyHoursSlot[];
  dayOfWeek: DayOfWeek;
  segmentStartMin: number;
  segmentEndMin: number;
}): boolean {
  if (!params.weeklyHours?.length) return true;
  const window = getWorkingWindowForDay(params.weeklyHours, params.dayOfWeek);
  if (!window.isEnabled) return false;
  return (
    params.segmentStartMin >= window.startMinutes &&
    params.segmentEndMin <= window.endMinutes
  );
}

export function resolveStaffForSegment(params: {
  line: ChainedBookingLineInput;
  dayOfWeek: DayOfWeek;
  segmentStartUtc: Date;
  segmentEndUtc: Date;
  segmentStartMin: number;
  segmentEndMin: number;
  shiftStartMin: number;
  shiftEndMin: number;
  slotIntervalMin: number;
  appointments: BlockingAppointment[];
  dayAppointments: BlockingAppointment[];
  tz: string;
  gapPolicy: ReturnType<typeof resolveGapAvoidancePolicy>;
  allowMultipleServices?: boolean;
  scheduling: {
    bufferTimeEnabled: boolean;
    businessFallback: BufferFallback;
  };
}): string | null {
  const occupancy = resolveLineOccupancy(params.line.timing);
  const fallbackBuffers = resolveLineBuffers(
    params.line.timing,
    params.scheduling,
  );

  const tryStaff = (
    staffId: string,
    weeklyHours?: WeeklyHoursSlot[],
  ): boolean => {
    if (
      !segmentWithinWorkingHours({
        weeklyHours,
        dayOfWeek: params.dayOfWeek,
        segmentStartMin: params.segmentStartMin,
        segmentEndMin: params.segmentEndMin,
      })
    ) {
      return false;
    }

    if (
      segmentHasOverlap(
        params.appointments,
        staffId,
        params.segmentStartUtc,
        params.segmentEndUtc,
      )
    ) {
      return false;
    }

    return segmentPassesGapRules({
      staffId,
      segmentStartMin: params.segmentStartMin,
      segmentEndMin: params.segmentEndMin,
      shiftStartMin: params.shiftStartMin,
      shiftEndMin: params.shiftEndMin,
      clientOccupancyMinutes: occupancy,
      slotIntervalMin: params.slotIntervalMin,
      dayAppointments: params.dayAppointments,
      tz: params.tz,
      fallbackBuffers,
      gapPolicy: params.gapPolicy,
      allowMultipleServices: params.allowMultipleServices,
    });
  };

  if (params.line.staffId && params.line.staffId !== 'anyone') {
    return tryStaff(params.line.staffId, params.line.weeklyHours)
      ? params.line.staffId
      : null;
  }

  const candidates = params.line.eligibleStaffIds ?? [];
  for (const staffId of candidates) {
    if (tryStaff(staffId, params.line.weeklyHours)) return staffId;
  }

  return null;
}

export function validateChainedStart(params: {
  chainStart: DateTime;
  chain: ChainedBookingLineInput[];
  windowStartMin: number;
  windowEndMin: number;
  slotIntervalMin: number;
  appointments: BlockingAppointment[];
  dayAppointments: BlockingAppointment[];
  tz: string;
  gapPolicy: ReturnType<typeof resolveGapAvoidancePolicy>;
  allowMultipleServices?: boolean;
  scheduling: {
    bufferTimeEnabled: boolean;
    businessFallback: BufferFallback;
  };
}): ResolvedChainedSegment[] | null {
  let cursor = params.chainStart;
  const resolved: ResolvedChainedSegment[] = [];
  const dayOfWeek = LUXON_WEEKDAY_TO_DAY[params.chainStart.weekday];

  for (const line of params.chain) {
    const occupancy = resolveLineOccupancy(line.timing);
    const segmentEnd = cursor.plus({ minutes: occupancy });
    const segmentStartMin = cursor.hour * 60 + cursor.minute;
    const segmentEndMin = segmentStartMin + occupancy;

    if (segmentEndMin > params.windowEndMin) {
      return null;
    }

    const staffId = resolveStaffForSegment({
      line,
      dayOfWeek,
      segmentStartUtc: cursor.toUTC().toJSDate(),
      segmentEndUtc: segmentEnd.toUTC().toJSDate(),
      segmentStartMin,
      segmentEndMin,
      shiftStartMin: params.windowStartMin,
      shiftEndMin: params.windowEndMin,
      slotIntervalMin: params.slotIntervalMin,
      appointments: params.appointments,
      dayAppointments: params.dayAppointments,
      tz: params.tz,
      gapPolicy: params.gapPolicy,
      allowMultipleServices: params.allowMultipleServices,
      scheduling: params.scheduling,
    });

    if (!staffId) {
      return null;
    }

    resolved.push({
      serviceId: line.serviceId,
      staffId,
      startAt: cursor.toUTC().toJSDate(),
      endAt: segmentEnd.toUTC().toJSDate(),
      clientOccupancyMinutes: occupancy,
    });

    cursor = segmentEnd;
  }

  return resolved;
}

export function sumChainOccupancy(
  chain: Array<{ timing: PublicBookingTimingContext | null }>,
): number {
  return chain.reduce(
    (total, line) => total + resolveLineOccupancy(line.timing),
    0,
  );
}
