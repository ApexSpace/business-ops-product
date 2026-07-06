import { DateTime } from 'luxon';

export function normalizeTimezone(timezone?: string | null): string {
  const tz = timezone?.trim();
  if (!tz) return 'UTC';
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

export function formatTimeDisplay(
  iso: Date | string,
  timezone: string,
): string {
  const dt = DateTime.fromJSDate(iso instanceof Date ? iso : new Date(iso), {
    zone: 'utc',
  }).setZone(normalizeTimezone(timezone));
  return dt.toFormat('h:mm a').toLowerCase();
}

export function formatDayDisplay(iso: Date | string, timezone: string): string {
  const dt = DateTime.fromJSDate(iso instanceof Date ? iso : new Date(iso), {
    zone: 'utc',
  }).setZone(normalizeTimezone(timezone));
  return dt.toFormat('ccc, LLL d');
}

export function formatDayKey(iso: Date | string, timezone: string): string {
  const dt = DateTime.fromJSDate(iso instanceof Date ? iso : new Date(iso), {
    zone: 'utc',
  }).setZone(normalizeTimezone(timezone));
  return dt.toFormat('yyyy-MM-dd');
}

export function formatFullDayDisplay(
  dateKey: string,
  timezone: string,
): string {
  const dt = DateTime.fromISO(dateKey, { zone: normalizeTimezone(timezone) });
  return dt.toFormat('ccc, LLL d, yyyy');
}

export function combineDateAndTime(
  dateKey: string,
  timeHm: string,
  timezone: string,
): Date {
  const [hours, minutes] = timeHm.split(':').map((v) => Number(v));
  const dt = DateTime.fromISO(dateKey, {
    zone: normalizeTimezone(timezone),
  }).set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });
  return dt.toUTC().toJSDate();
}

export function resolveTimePeriodRange(
  timePeriod: string | undefined,
  timezone: string,
  startDate?: string,
  endDate?: string,
): { from?: Date; to?: Date } {
  const zone = normalizeTimezone(timezone);
  const now = DateTime.now().setZone(zone);

  switch (timePeriod) {
    case 'today': {
      const start = now.startOf('day');
      const end = now.endOf('day');
      return { from: start.toUTC().toJSDate(), to: end.toUTC().toJSDate() };
    }
    case 'this_week': {
      const start = now.startOf('week').minus({ days: 1 });
      const weekStart =
        start.weekday === 7 ? start : start.minus({ days: start.weekday });
      const end = weekStart.plus({ days: 6 }).endOf('day');
      return {
        from: weekStart.startOf('day').toUTC().toJSDate(),
        to: end.toUTC().toJSDate(),
      };
    }
    case 'this_month': {
      const start = now.startOf('month');
      const end = now.endOf('month');
      return { from: start.toUTC().toJSDate(), to: end.toUTC().toJSDate() };
    }
    case 'custom': {
      if (!startDate && !endDate) return {};
      const from = startDate
        ? DateTime.fromISO(startDate, { zone })
            .startOf('day')
            .toUTC()
            .toJSDate()
        : undefined;
      const to = endDate
        ? DateTime.fromISO(endDate, { zone }).endOf('day').toUTC().toJSDate()
        : undefined;
      return { from, to };
    }
    default:
      return {};
  }
}
