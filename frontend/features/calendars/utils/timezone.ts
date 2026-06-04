/**
 * Timezone-aware date/time helpers (Luxon).
 * Stored instants remain UTC in the API/DB — only display and input boundaries use IANA zones.
 */

import { DateTime } from "luxon";
import type { Calendar } from "@/features/calendars/schemas/calendar-profile";

export const FALLBACK_TIMEZONE = "UTC";

/** Minimal calendar fields needed for timezone resolution */
export type CalendarTimezoneSource = Pick<Calendar, "id" | "timezone">;

export function normalizeTimezone(timezone?: string | null): string {
  const tz = timezone?.trim();
  if (!tz) return FALLBACK_TIMEZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

/** Business timezone, or a selected calendar's timezone when filtering one calendar. */
export function resolveAppointmentDisplayTimezone(
  businessTimezone: string | null | undefined,
  calendarId: string | undefined,
  calendars?: CalendarTimezoneSource[],
): string {
  if (calendarId && calendars?.length) {
    const cal = calendars.find((c) => c.id === calendarId);
    if (cal?.timezone) return normalizeTimezone(cal.timezone);
  }
  return normalizeTimezone(businessTimezone);
}

export function todayDateKeyInTimezone(timezone: string): string {
  return DateTime.now().setZone(timezone).toFormat("yyyy-MM-dd");
}

/** Parse YYYY-MM-DD as a calendar date in the given timezone (not browser local). */
export function parseDateKeyInTimezone(
  dateKey: string,
  timezone: string,
): DateTime {
  const dt = DateTime.fromISO(dateKey, { zone: timezone });
  if (!dt.isValid) {
    return DateTime.now().setZone(timezone).startOf("day");
  }
  return dt.startOf("day");
}

export function dateKeyFromUtcIso(iso: string, timezone: string): string {
  return DateTime.fromISO(iso, { zone: "utc" })
    .setZone(timezone)
    .toFormat("yyyy-MM-dd");
}

export function utcIsoToDisplayDate(iso: string, timezone: string): Date {
  return DateTime.fromISO(iso, { zone: "utc" }).setZone(timezone).toJSDate();
}

export function getUtcRangeForLocalDay(
  dateKey: string,
  timezone: string,
): { start: Date; end: Date } {
  const start = parseDateKeyInTimezone(dateKey, timezone);
  const end = start.endOf("day");
  return {
    start: start.toUTC().toJSDate(),
    end: end.toUTC().toJSDate(),
  };
}

/** Sunday-start week containing dateKey. */
export function getWeekDateKeysInTimezone(
  anchorDateKey: string,
  timezone: string,
): string[] {
  const anchor = parseDateKeyInTimezone(anchorDateKey, timezone);
  const daysFromSunday = anchor.weekday === 7 ? 0 : anchor.weekday;
  const weekStart = anchor.minus({ days: daysFromSunday });
  return Array.from({ length: 7 }, (_, i) =>
    weekStart.plus({ days: i }).toFormat("yyyy-MM-dd"),
  );
}

export function getUtcRangeForLocalWeek(
  anchorDateKey: string,
  timezone: string,
): { start: Date; end: Date } {
  const keys = getWeekDateKeysInTimezone(anchorDateKey, timezone);
  const start = parseDateKeyInTimezone(keys[0]!, timezone);
  const end = parseDateKeyInTimezone(keys[6]!, timezone).endOf("day");
  return {
    start: start.toUTC().toJSDate(),
    end: end.toUTC().toJSDate(),
  };
}

export function getMonthGridDateKeysInTimezone(
  anchorDateKey: string,
  timezone: string,
): string[] {
  const anchor = parseDateKeyInTimezone(anchorDateKey, timezone);
  const monthStart = anchor.startOf("month");
  const monthEnd = anchor.endOf("month");
  const daysFromSunday = monthStart.weekday === 7 ? 0 : monthStart.weekday;
  const gridStart = monthStart.minus({ days: daysFromSunday });
  const trailing =
    monthEnd.weekday === 7 ? 6 : 6 - monthEnd.weekday;
  const gridEnd = monthEnd.plus({ days: trailing });
  const keys: string[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    keys.push(cursor.toFormat("yyyy-MM-dd"));
    cursor = cursor.plus({ days: 1 });
  }
  return keys;
}

export function getUtcRangeForLocalMonth(
  anchorDateKey: string,
  timezone: string,
): { start: Date; end: Date } {
  const keys = getMonthGridDateKeysInTimezone(anchorDateKey, timezone);
  const start = parseDateKeyInTimezone(keys[0]!, timezone);
  const end = parseDateKeyInTimezone(keys[keys.length - 1]!, timezone).endOf(
    "day",
  );
  return {
    start: start.toUTC().toJSDate(),
    end: end.toUTC().toJSDate(),
  };
}

export function navigateDateKeyInTimezone(
  anchorDateKey: string,
  timezone: string,
  view: "day" | "week" | "month",
  direction: -1 | 0 | 1,
): string {
  if (direction === 0) return todayDateKeyInTimezone(timezone);
  let dt = parseDateKeyInTimezone(anchorDateKey, timezone);
  if (view === "day") dt = dt.plus({ days: direction });
  else if (view === "week") dt = dt.plus({ weeks: direction });
  else if (view === "month") dt = dt.plus({ months: direction });
  return dt.toFormat("yyyy-MM-dd");
}

export function isTodayDateKey(dateKey: string, timezone: string): boolean {
  return dateKey === todayDateKeyInTimezone(timezone);
}

/** 12-hour clock for appointment UI (consistent across calendar, forms, lists). */
export function formatTimeInTimezone(iso: string, timezone: string): string {
  return DateTime.fromISO(iso, { zone: "utc" })
    .setZone(timezone)
    .toLocaleString({ hour: "numeric", minute: "2-digit", hour12: true });
}

/** Timezone for layout: always the appointment's calendar (stable when filtering all vs one). */
export function resolveTimezoneForAppointment(
  calendarId: string,
  calendars?: CalendarTimezoneSource[],
  businessTimezone?: string | null,
): string {
  return resolveAppointmentDisplayTimezone(
    businessTimezone,
    calendarId,
    calendars,
  );
}

export function groupAppointmentsByCalendarTimezone<
  T extends { calendarId: string; startAt: string },
>(
  items: T[],
  calendars?: CalendarTimezoneSource[],
  businessTimezone?: string | null,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const tz = resolveTimezoneForAppointment(
      item.calendarId,
      calendars,
      businessTimezone,
    );
    const key = dateKeyFromUtcIso(item.startAt, tz);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  for (const [, list] of map) {
    list.sort(
      (a, b) =>
        new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  }
  return map;
}

export function formatDateTimeInTimezone(iso: string, timezone: string): string {
  return DateTime.fromISO(iso, { zone: "utc" })
    .setZone(timezone)
    .toLocaleString(DateTime.DATETIME_MED);
}

export function formatDateInTimezone(iso: string, timezone: string): string {
  return DateTime.fromISO(iso, { zone: "utc" })
    .setZone(timezone)
    .toLocaleString(DateTime.DATE_MED);
}

export function formatShortWeekdayForDateKey(
  dateKey: string,
  timezone: string,
): string {
  return parseDateKeyInTimezone(dateKey, timezone).toFormat("ccc");
}

export function formatDayMonthForDateKey(
  dateKey: string,
  timezone: string,
): string {
  return parseDateKeyInTimezone(dateKey, timezone).toFormat("MMM d");
}

/** Fixed English patterns so SSR and browser hydration produce identical labels. */
export function formatDateRangeLabelInTimezone(
  anchorDateKey: string,
  view: "day" | "week" | "month" | "list",
  timezone: string,
): string {
  const anchor = parseDateKeyInTimezone(anchorDateKey, timezone);
  if (view === "day") {
    return anchor.toFormat("cccc, MMMM d, yyyy");
  }
  if (view === "week") {
    const keys = getWeekDateKeysInTimezone(anchorDateKey, timezone);
    const start = parseDateKeyInTimezone(keys[0]!, timezone);
    const end = parseDateKeyInTimezone(keys[6]!, timezone);
    const sameYear = start.year === end.year;
    const startStr = sameYear
      ? start.toFormat("MMM d")
      : start.toFormat("MMM d, yyyy");
    const endStr = end.toFormat("MMM d, yyyy");
    return `${startStr} – ${endStr}`;
  }
  if (view === "month") {
    return anchor.toFormat("MMMM yyyy");
  }
  return "All appointments";
}

export function getMinutesFromMidnightInTimezone(
  iso: string,
  timezone: string,
): number {
  const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(timezone);
  return dt.hour * 60 + dt.minute;
}

/** Wall time in timezone → UTC ISO for API (create/update only; never mutates existing rows). */
export function localDateTimeInputToUtc(
  localValue: string,
  timezone: string,
): string {
  const dt = DateTime.fromISO(localValue, { zone: timezone });
  if (!dt.isValid) {
    return DateTime.fromISO(localValue).toUTC().toISO() ?? new Date().toISOString();
  }
  return dt.toUTC().toISO()!;
}

/** UTC ISO → value for datetime-local input in timezone. */
export function utcToLocalDateTimeInputValue(
  iso: string,
  timezone: string,
): string {
  const dt = DateTime.fromISO(iso, { zone: "utc" }).setZone(timezone);
  if (!dt.isValid) return "";
  return dt.toFormat("yyyy-MM-dd'T'HH:mm");
}

export function wallTimeInTimezoneToUtcIso(
  dateKey: string,
  hour: number,
  minute: number,
  timezone: string,
): string {
  const dt = parseDateKeyInTimezone(dateKey, timezone).set({
    hour,
    minute,
    second: 0,
    millisecond: 0,
  });
  return dt.toUTC().toISO()!;
}

export function groupByDateKeyInTimezone<T extends { startAt: string }>(
  items: T[],
  timezone: string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = dateKeyFromUtcIso(item.startAt, timezone);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  for (const [, list] of map) {
    list.sort(
      (a, b) =>
        new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  }
  return map;
}

export function getVisibleUtcRange(
  anchorDateKey: string,
  view: "day" | "week" | "month",
  timezone: string,
): { start: Date; end: Date } {
  if (view === "day") return getUtcRangeForLocalDay(anchorDateKey, timezone);
  if (view === "week") return getUtcRangeForLocalWeek(anchorDateKey, timezone);
  return getUtcRangeForLocalMonth(anchorDateKey, timezone);
}

export function toIsoRangeBound(date: Date): string {
  return date.toISOString();
}
