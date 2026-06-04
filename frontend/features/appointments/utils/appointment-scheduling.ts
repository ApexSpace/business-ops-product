import { DateTime } from "luxon";
import { minutesToTimeLabel } from "@/features/calendars/utils/calendar-dates";
import type { Calendar } from "@/features/calendars/schemas/calendar-profile";
import {
  dateKeyFromUtcIso,
  getMinutesFromMidnightInTimezone,
  parseDateKeyInTimezone,
  todayDateKeyInTimezone,
} from "@/features/calendars/utils/timezone";

export const DEFAULT_SLOT_INTERVAL_MINUTES = 15;
export const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30;
export const SCHEDULE_DAY_START_HOUR = 0;
export const SCHEDULE_DAY_END_HOUR = 24;

export interface CalendarSchedulingConfig {
  slotIntervalMinutes: number;
  defaultDurationMinutes: number;
}

export function getCalendarSchedulingConfig(
  calendar?: Calendar | null,
): CalendarSchedulingConfig {
  return {
    slotIntervalMinutes:
      calendar?.slotIntervalMinutes ?? DEFAULT_SLOT_INTERVAL_MINUTES,
    defaultDurationMinutes:
      calendar?.defaultDurationMinutes ?? DEFAULT_APPOINTMENT_DURATION_MINUTES,
  };
}

/** Minutes-from-midnight slot starts for the full day grid. */
export function generateTimeSlots(
  slotIntervalMinutes: number,
  dayStartHour = SCHEDULE_DAY_START_HOUR,
  dayEndHour = SCHEDULE_DAY_END_HOUR,
): number[] {
  const slots: number[] = [];
  const start = dayStartHour * 60;
  const end = dayEndHour * 60;
  for (let m = start; m < end; m += slotIntervalMinutes) {
    slots.push(m);
  }
  return slots;
}

/** @deprecated Use generateTimeSlots */
export const generateStartTimeSlots = generateTimeSlots;

export function snapMinutesToSlot(
  minutes: number,
  slotIntervalMinutes: number,
): number {
  return Math.round(minutes / slotIntervalMinutes) * slotIntervalMinutes;
}

export function getDefaultEndMinutes(
  startMinutes: number,
  durationMinutes: number,
  slotIntervalMinutes: number,
): number {
  const rawEnd = startMinutes + durationMinutes;
  const snapped = Math.ceil(rawEnd / slotIntervalMinutes) * slotIntervalMinutes;
  return Math.min(snapped, SCHEDULE_DAY_END_HOUR * 60);
}

/** Valid end slots: after start, on interval grid, at least one slot duration. */
export function generateEndTimeSlots(
  startMinutes: number,
  slotIntervalMinutes: number,
  durationMinutes: number,
  dayEndHour = SCHEDULE_DAY_END_HOUR,
): number[] {
  const minEnd = getDefaultEndMinutes(
    startMinutes,
    durationMinutes,
    slotIntervalMinutes,
  );
  const slots: number[] = [];
  for (
    let m = minEnd;
    m <= dayEndHour * 60;
    m += slotIntervalMinutes
  ) {
    if (m > startMinutes) slots.push(m);
  }
  return slots;
}

export function formatSlotLabel(minutes: number): string {
  return minutesToTimeLabel(minutes);
}

export function formatSlotRangeLabel(
  startMinutes: number,
  durationMinutes: number,
): string {
  const endMinutes = startMinutes + durationMinutes;
  return `${formatSlotLabel(startMinutes)} – ${formatSlotLabel(endMinutes)}`;
}

export function parseLocalDateTimeInput(value: string): {
  dateKey: string;
  startMinutes: number;
  endMinutes: number;
} | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [, dateKey, h, m] = match;
  const startMinutes = Number(h) * 60 + Number(m);
  return { dateKey: dateKey!, startMinutes, endMinutes: startMinutes };
}

export function parseStartEndLocalInputs(
  startAt: string,
  endAt: string,
): { dateKey: string; startMinutes: number; endMinutes: number } | null {
  const start = parseLocalDateTimeInput(startAt);
  const end = parseLocalDateTimeInput(endAt);
  if (!start || !end) return null;
  if (start.dateKey !== end.dateKey) {
    return {
      dateKey: start.dateKey,
      startMinutes: start.startMinutes,
      endMinutes: end.startMinutes,
    };
  }
  return {
    dateKey: start.dateKey,
    startMinutes: start.startMinutes,
    endMinutes: end.endMinutes,
  };
}

export function composeLocalDateTime(
  dateKey: string,
  minutes: number,
): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dateKey}T${pad(h)}:${pad(m)}`;
}

export function syncStartEndFields(
  dateKey: string,
  startMinutes: number,
  endMinutes: number,
): { startAt: string; endAt: string } {
  return {
    startAt: composeLocalDateTime(dateKey, startMinutes),
    endAt: composeLocalDateTime(dateKey, endMinutes),
  };
}

export interface TimedBooking {
  id?: string;
  startAt: string;
  endAt: string;
}

export function slotOverlapsBooking(
  booking: TimedBooking,
  dateKey: string,
  slotStartMinutes: number,
  durationMinutes: number,
  timezone: string,
  excludeId?: string,
): boolean {
  if (excludeId && booking.id === excludeId) return false;
  if (dateKeyFromUtcIso(booking.startAt, timezone) !== dateKey) return false;
  const bookingStart = getMinutesFromMidnightInTimezone(booking.startAt, timezone);
  const bookingEnd = getMinutesFromMidnightInTimezone(booking.endAt, timezone);
  const slotEnd = slotStartMinutes + durationMinutes;
  return slotStartMinutes < bookingEnd && bookingStart < slotEnd;
}

export function isSlotBusy(
  dateKey: string,
  slotStartMinutes: number,
  config: CalendarSchedulingConfig,
  timezone: string,
  busyBookings: TimedBooking[],
  excludeId?: string,
): boolean {
  return busyBookings.some((b) =>
    slotOverlapsBooking(
      b,
      dateKey,
      slotStartMinutes,
      config.defaultDurationMinutes,
      timezone,
      excludeId,
    ),
  );
}

/** Next slot on or after now (today) or first slot (future days), skipping busy times. */
export function findNextAvailableSlot(
  dateKey: string,
  timezone: string,
  config: CalendarSchedulingConfig,
  busyBookings: TimedBooking[] = [],
  options?: {
    excludeAppointmentId?: string;
    preferredStartMinutes?: number;
  },
): { dateKey: string; startMinutes: number } {
  const slots = generateTimeSlots(config.slotIntervalMinutes);
  if (slots.length === 0) {
    return { dateKey, startMinutes: 9 * 60 };
  }

  const tryDate = (key: string, minMinutes: number, preferred?: number) => {
    if (preferred !== undefined) {
      const snapped = snapMinutesToSlot(preferred, config.slotIntervalMinutes);
      if (
        snapped >= minMinutes &&
        slots.includes(snapped) &&
        !isSlotBusy(key, snapped, config, timezone, busyBookings, options?.excludeAppointmentId)
      ) {
        return snapped;
      }
    }
    for (const slot of slots) {
      if (slot < minMinutes) continue;
      if (
        !isSlotBusy(key, slot, config, timezone, busyBookings, options?.excludeAppointmentId)
      ) {
        return slot;
      }
    }
    return undefined;
  };

  const todayKey = todayDateKeyInTimezone(timezone);
  const now = DateTime.now().setZone(timezone);
  const interval = config.slotIntervalMinutes;

  let minMinutes = slots[0]!;
  if (dateKey === todayKey) {
    const nowMinutes = now.hour * 60 + now.minute;
    minMinutes = Math.ceil(nowMinutes / interval) * interval;
  }

  const found = tryDate(dateKey, minMinutes, options?.preferredStartMinutes);
  if (found !== undefined) {
    return { dateKey, startMinutes: found };
  }

  if (dateKey === todayKey) {
    const tomorrow = parseDateKeyInTimezone(dateKey, timezone)
      .plus({ days: 1 })
      .toFormat("yyyy-MM-dd");
    const tomorrowSlot = tryDate(tomorrow, slots[0]!);
    if (tomorrowSlot !== undefined) {
      return { dateKey: tomorrow, startMinutes: tomorrowSlot };
    }
  }

  return {
    dateKey,
    startMinutes: slots.find((s) => s >= minMinutes) ?? slots[0]!,
  };
}

export function resolveInitialSchedule(
  startAt: string,
  endAt: string,
  config: CalendarSchedulingConfig,
  timezone?: string,
  busyBookings: TimedBooking[] = [],
  options?: { excludeAppointmentId?: string; useNextAvailable?: boolean },
): { dateKey: string; startMinutes: number; endMinutes: number } {
  const parsed = parseStartEndLocalInputs(startAt, endAt);
  const tz = timezone ?? "UTC";
  const todayKey = todayDateKeyInTimezone(tz);

  if (!parsed || options?.useNextAvailable) {
    const baseDate = parsed?.dateKey ?? todayKey;
    const next = findNextAvailableSlot(baseDate, tz, config, busyBookings, {
      excludeAppointmentId: options?.excludeAppointmentId,
      preferredStartMinutes: parsed?.startMinutes,
    });
    const endMinutes = getDefaultEndMinutes(
      next.startMinutes,
      config.defaultDurationMinutes,
      config.slotIntervalMinutes,
    );
    return { dateKey: next.dateKey, startMinutes: next.startMinutes, endMinutes };
  }

  const startMinutes = snapMinutesToSlot(
    parsed.startMinutes,
    config.slotIntervalMinutes,
  );
  let endMinutes = snapMinutesToSlot(
    parsed.endMinutes,
    config.slotIntervalMinutes,
  );
  if (endMinutes <= startMinutes) {
    endMinutes = getDefaultEndMinutes(
      startMinutes,
      config.defaultDurationMinutes,
      config.slotIntervalMinutes,
    );
  }

  return {
    dateKey: parsed.dateKey,
    startMinutes,
    endMinutes,
  };
}
