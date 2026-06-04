import { DateTime } from 'luxon';

export const FALLBACK_TIMEZONE = 'UTC';

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

export function getUtcRangeForLocalDay(
  date: Date,
  timezone: string,
): { start: Date; end: Date } {
  const z = normalizeTimezone(timezone);
  const dt = DateTime.fromJSDate(date, { zone: z }).startOf('day');
  return {
    start: dt.toUTC().toJSDate(),
    end: dt.endOf('day').toUTC().toJSDate(),
  };
}

export function getUtcRangeForLocalWeek(
  date: Date,
  timezone: string,
): { start: Date; end: Date } {
  const z = normalizeTimezone(timezone);
  const anchor = DateTime.fromJSDate(date, { zone: z }).startOf('day');
  const daysFromSunday = anchor.weekday === 7 ? 0 : anchor.weekday;
  const weekStart = anchor.minus({ days: daysFromSunday });
  const weekEnd = weekStart.plus({ days: 6 }).endOf('day');
  return {
    start: weekStart.toUTC().toJSDate(),
    end: weekEnd.toUTC().toJSDate(),
  };
}

/** Start of "today" and boundaries for dashboard appointment stats. */
export function getBusinessDayBoundariesUtc(timezone?: string | null): {
  startOfToday: Date;
  endOfToday: Date;
  now: Date;
} {
  const z = normalizeTimezone(timezone);
  const now = DateTime.now().setZone(z);
  const startOfToday = now.startOf('day').toUTC().toJSDate();
  const endOfToday = now.endOf('day').toUTC().toJSDate();
  return {
    startOfToday,
    endOfToday,
    now: now.toUTC().toJSDate(),
  };
}
