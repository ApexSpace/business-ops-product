/** Date helpers for appointment calendar views. Prefer timezone.ts for TZ-aware logic. */
import { DateTime } from "luxon";
import {
  formatTimeInTimezone,
  getMinutesFromMidnightInTimezone,
} from "@/lib/timezone";

export type CalendarViewMode = "day" | "week" | "month" | "list";

export const CALENDAR_SLOT_MINUTES = 30;
/** Midnight — first slot label 12 AM */
export const CALENDAR_DAY_START_HOUR = 0;
/** End of day — last slot 11:00–11:30 PM (exclusive 24:00 bound) */
export const CALENDAR_DAY_END_HOUR = 24;
export const CALENDAR_SLOT_HEIGHT_PX = 40;
/** Minimum rendered height for an appointment block in day/week views. */
export const CALENDAR_EVENT_MIN_HEIGHT_PX = 36;
export const MONTH_MAX_VISIBLE_EVENTS = 3;

export interface DateRange {
  start: Date;
  end: Date;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return startOfDay(new Date());
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return formatDateKey(a) === formatDateKey(b);
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function getDayRange(date: Date): DateRange {
  return { start: startOfDay(date), end: endOfDay(date) };
}

/** Week starts Sunday (US-style scheduling). */
export function getWeekRange(date: Date): DateRange {
  const start = startOfDay(date);
  const dayOfWeek = start.getDay();
  const weekStart = addDays(start, -dayOfWeek);
  const weekEnd = endOfDay(addDays(weekStart, 6));
  return { start: weekStart, end: weekEnd };
}

export function getWeekDays(date: Date): Date[] {
  const { start } = getWeekRange(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getMonthRange(date: Date): { year: number; month: number } {
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** Includes leading/trailing days visible in a month grid. */
export function getMonthVisibleRange(date: Date): DateRange {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const gridStart = addDays(startOfDay(firstOfMonth), -firstOfMonth.getDay());
  const gridEnd = endOfDay(
    addDays(startOfDay(lastOfMonth), 6 - lastOfMonth.getDay()),
  );
  return { start: gridStart, end: gridEnd };
}

export function getMonthGridDays(date: Date): Date[] {
  const { start, end } = getMonthVisibleRange(date);
  const days: Date[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function navigateDate(
  date: Date,
  view: CalendarViewMode,
  direction: -1 | 0 | 1,
): Date {
  if (direction === 0) return startOfDay(new Date());
  const d = startOfDay(date);
  if (view === "day") return addDays(d, direction);
  if (view === "week") return addDays(d, direction * 7);
  if (view === "month") return addMonths(d, direction);
  return d;
}

export function toIsoRangeBound(date: Date): string {
  return date.toISOString();
}

export function formatTime(date: Date | string, timeZone?: string): string {
  const iso =
    typeof date === "string" ? date : date.toISOString();
  if (timeZone) {
    return formatTimeInTimezone(iso, timeZone);
  }
  const dt = DateTime.fromISO(iso);
  if (!dt.isValid) return "";
  return dt.toLocaleString({ hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatShortWeekday(date: Date, timeZone?: string): string {
  return date.toLocaleDateString([], {
    weekday: "short",
    timeZone,
  });
}

export function formatDayMonth(date: Date, timeZone?: string): string {
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    timeZone,
  });
}

export function formatDateRangeLabel(
  date: Date,
  view: CalendarViewMode,
  timeZone?: string,
): string {
  if (view === "day") {
    return date.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone,
    });
  }
  if (view === "week") {
    const { start, end } = getWeekRange(date);
    const sameYear = start.getFullYear() === end.getFullYear();
    const startStr = start.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: sameYear ? undefined : "numeric",
      timeZone,
    });
    const endStr = end.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone,
    });
    return `${startStr} – ${endStr}`;
  }
  if (view === "month") {
    return date.toLocaleDateString([], {
      month: "long",
      year: "numeric",
      timeZone,
    });
  }
  return "All appointments";
}

export function groupAppointmentsByDay<T extends { startAt: string }>(
  appointments: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const apt of appointments) {
    const key = formatDateKey(new Date(apt.startAt));
    const list = map.get(key) ?? [];
    list.push(apt);
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

export function getVisibleRange(
  date: Date,
  view: CalendarViewMode,
): DateRange | null {
  if (view === "day") return getDayRange(date);
  if (view === "week") return getWeekRange(date);
  if (view === "month") return getMonthVisibleRange(date);
  return null;
}

export function getMinutesFromMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function setTimeOnDate(base: Date, hours: number, minutes: number): Date {
  const d = new Date(base);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function minutesToTimeLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${hour12} ${period}`
    : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export interface EventPosition {
  top: number;
  height: number;
}

export function calculateEventPosition(
  startAt: string,
  endAt: string,
  dayStartHour = CALENDAR_DAY_START_HOUR,
  dayEndHour = CALENDAR_DAY_END_HOUR,
  slotMinutes = CALENDAR_SLOT_MINUTES,
  slotHeightPx = CALENDAR_SLOT_HEIGHT_PX,
  timezone?: string,
): EventPosition {
  const gridStartMinutes = dayStartHour * 60;
  const gridEndMinutes = dayEndHour * 60;
  const startMinutes = timezone
    ? getMinutesFromMidnightInTimezone(startAt, timezone)
    : getMinutesFromMidnight(new Date(startAt));
  const endMinutes = timezone
    ? getMinutesFromMidnightInTimezone(endAt, timezone)
    : getMinutesFromMidnight(new Date(endAt));

  const clampedStart = Math.max(startMinutes, gridStartMinutes);
  const clampedEnd = Math.min(Math.max(endMinutes, clampedStart + 15), gridEndMinutes);

  const top =
    ((clampedStart - gridStartMinutes) / slotMinutes) * slotHeightPx;
  const height = Math.max(
    ((clampedEnd - clampedStart) / slotMinutes) * slotHeightPx,
    CALENDAR_EVENT_MIN_HEIGHT_PX,
  );

  return { top, height };
}

export function getTimeGridHeight(
  dayStartHour = CALENDAR_DAY_START_HOUR,
  dayEndHour = CALENDAR_DAY_END_HOUR,
  slotMinutes = CALENDAR_SLOT_MINUTES,
  slotHeightPx = CALENDAR_SLOT_HEIGHT_PX,
): number {
  const slots = ((dayEndHour - dayStartHour) * 60) / slotMinutes;
  return slots * slotHeightPx;
}

export function getTimeSlotLabels(
  dayStartHour = CALENDAR_DAY_START_HOUR,
  dayEndHour = CALENDAR_DAY_END_HOUR,
  slotMinutes = CALENDAR_SLOT_MINUTES,
): number[] {
  const labels: number[] = [];
  for (let m = dayStartHour * 60; m < dayEndHour * 60; m += slotMinutes) {
    labels.push(m);
  }
  return labels;
}

export function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
