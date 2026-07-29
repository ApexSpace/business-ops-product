import type { Service } from "@/lib/types/api";
import {
  composeLocalDateTime,
  formatSlotLabel,
  generateTimeSlots,
} from "@/features/appointments/utils/appointment-scheduling";
import {
  dateKeyFromUtcIso,
  getMinutesFromMidnightInTimezone,
  localDateTimeInputToUtc,
  wallTimeInTimezoneToUtcIso,
} from "@/features/calendars/utils/timezone";

export const DURATION_STEP_MINUTES = 15;
export const MAX_DURATION_MINUTES = 4 * 60;

export interface AppointmentServiceLineSelection {
  serviceId: string;
  name: string;
  price: string | null;
  assignedToId: string;
  startMinutes: number;
  occupancyMinutes: number;
  clientOccupancyMinutes: number;
  staffBlockedMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}

export interface StaffOption {
  userId: string;
  label: string;
}

export function formatDurationLabel(minutes: number): string {
  if (minutes <= 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) {
    return hours === 1 ? "1 hr" : `${hours} hr`;
  }
  return `${hours} hr ${remainder} min`;
}

export function generateDurationOptions(
  stepMinutes = DURATION_STEP_MINUTES,
  maxMinutes = MAX_DURATION_MINUTES,
): number[] {
  const options: number[] = [];
  for (let m = stepMinutes; m <= maxMinutes; m += stepMinutes) {
    options.push(m);
  }
  return options;
}

export function resolveServiceOccupancyMinutes(service: Service): number {
  return service.clientOccupancyMinutes ?? service.durationMinutes ?? 60;
}

export function serviceToLineSelection(
  service: Service,
  options: {
    assignedToId: string;
    startMinutes: number;
  },
): AppointmentServiceLineSelection {
  const occupancy = resolveServiceOccupancyMinutes(service);
  return {
    serviceId: service.id,
    name: service.name,
    price: service.price,
    assignedToId: options.assignedToId,
    startMinutes: options.startMinutes,
    occupancyMinutes: occupancy,
    clientOccupancyMinutes: occupancy,
    staffBlockedMinutes: service.staffBlockedMinutes ?? occupancy,
    bufferBeforeMinutes: service.hasBufferTime ? service.bufferBeforeMinutes : 0,
    bufferAfterMinutes: service.hasBufferTime ? service.bufferAfterMinutes : 0,
  };
}

export function getChainedStartMinutes(
  lines: AppointmentServiceLineSelection[],
  index: number,
  appointmentStartMinutes: number,
): number {
  if (index === 0) return appointmentStartMinutes;
  const previous = lines[index - 1];
  if (!previous) return appointmentStartMinutes;
  return previous.startMinutes + previous.occupancyMinutes;
}

/**
 * Sequence every service line from the appointment start time, so the first
 * line begins at `appointmentStartMinutes` and each subsequent line follows the
 * previous one. Used when the appointment start (Time field) changes.
 */
export function rechainAllServiceLines(
  lines: AppointmentServiceLineSelection[],
  appointmentStartMinutes: number,
): AppointmentServiceLineSelection[] {
  let cursor = appointmentStartMinutes;
  return lines.map((line) => {
    const startMinutes = cursor;
    cursor = startMinutes + line.occupancyMinutes;
    return { ...line, startMinutes };
  });
}

export function rechainServiceLinesAfterChange(
  lines: AppointmentServiceLineSelection[],
  appointmentStartMinutes: number,
  changedIndex: number,
): AppointmentServiceLineSelection[] {
  return lines.map((line, index) => {
    if (index === 0) {
      return index === changedIndex
        ? line
        : { ...line, startMinutes: appointmentStartMinutes };
    }
    if (index <= changedIndex) {
      return line;
    }
    const previous = lines[index - 1]!;
    return {
      ...line,
      startMinutes: previous.startMinutes + previous.occupancyMinutes,
    };
  });
}

export function sumServiceLineDurations(
  lines: AppointmentServiceLineSelection[],
): number {
  return lines.reduce((total, line) => total + line.occupancyMinutes, 0);
}

export function computeAppointmentEndMinutes(
  appointmentStartMinutes: number,
  lines: AppointmentServiceLineSelection[],
): number {
  if (lines.length === 0) {
    return appointmentStartMinutes + 30;
  }
  const last = lines[lines.length - 1]!;
  return last.startMinutes + last.occupancyMinutes;
}

export function buildAppointmentSchedulePayload(options: {
  dateKey: string;
  appointmentStartMinutes: number;
  lines: AppointmentServiceLineSelection[];
  timezone: string;
}): {
  startAt: string;
  endAt: string;
  services: Array<{
    serviceId: string;
    assignedToId: string;
    startAt: string;
    durationMinutes: number;
    price?: string;
  }>;
} {
  const { dateKey, appointmentStartMinutes, lines, timezone } = options;
  const startAt = wallTimeInTimezoneToUtcIso(
    dateKey,
    Math.floor(appointmentStartMinutes / 60),
    appointmentStartMinutes % 60,
    timezone,
  );
  const endMinutes = computeAppointmentEndMinutes(
    appointmentStartMinutes,
    lines,
  );
  const endAt = wallTimeInTimezoneToUtcIso(
    dateKey,
    Math.floor(endMinutes / 60),
    endMinutes % 60,
    timezone,
  );

  const services = lines.map((line) => {
    const lineStartAt = wallTimeInTimezoneToUtcIso(
      dateKey,
      Math.floor(line.startMinutes / 60),
      line.startMinutes % 60,
      timezone,
    );
    return {
      serviceId: line.serviceId,
      assignedToId: line.assignedToId,
      startAt: lineStartAt,
      durationMinutes: line.occupancyMinutes,
      ...(line.price ? { price: line.price } : {}),
    };
  });

  return { startAt, endAt, services };
}

export function scheduleFromUtcIso(
  startAtIso: string,
  endAtIso: string,
  timezone: string,
): {
  dateKey: string;
  appointmentStartMinutes: number;
  appointmentEndMinutes: number;
} {
  return {
    dateKey: dateKeyFromUtcIso(startAtIso, timezone),
    appointmentStartMinutes: getMinutesFromMidnightInTimezone(
      startAtIso,
      timezone,
    ),
    appointmentEndMinutes: getMinutesFromMidnightInTimezone(endAtIso, timezone),
  };
}

export function appointmentLinesFromResponse(
  lines: Array<{
    serviceId: string;
    assignedToId: string | null;
    startAt: string | null;
    durationMinutes: number | null;
    price: string | null;
    service: {
      name: string;
      durationMinutes: number;
      price: string | null;
    };
  }>,
  fallbackAssignedToId: string,
  appointmentStartIso: string,
  timezone: string,
): AppointmentServiceLineSelection[] {
  const appointmentStartMinutes = getMinutesFromMidnightInTimezone(
    appointmentStartIso,
    timezone,
  );

  return lines.map((line, index) => {
    const occupancy =
      line.durationMinutes ??
      line.service.durationMinutes ??
      60;
    const startMinutes = line.startAt
      ? getMinutesFromMidnightInTimezone(line.startAt, timezone)
      : index === 0
        ? appointmentStartMinutes
        : appointmentStartMinutes;

    return {
      serviceId: line.serviceId,
      name: line.service.name,
      price: line.price ?? line.service.price,
      assignedToId: line.assignedToId ?? fallbackAssignedToId,
      startMinutes,
      occupancyMinutes: occupancy,
      clientOccupancyMinutes: occupancy,
      staffBlockedMinutes: occupancy,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
    };
  });
}

export function formatTimeSlotLabel(minutes: number): string {
  return formatSlotLabel(minutes);
}

export function generateAppointmentTimeSlots(
  slotIntervalMinutes = DURATION_STEP_MINUTES,
): number[] {
  return generateTimeSlots(slotIntervalMinutes);
}

export function localDateTimeFromSchedule(
  dateKey: string,
  minutes: number,
): string {
  return composeLocalDateTime(dateKey, minutes);
}

export function utcFromLocalSchedule(
  dateKey: string,
  minutes: number,
  timezone: string,
): string {
  return localDateTimeInputToUtc(
    composeLocalDateTime(dateKey, minutes),
    timezone,
  );
}
