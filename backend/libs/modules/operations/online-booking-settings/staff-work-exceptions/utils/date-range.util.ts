import { DateTime } from 'luxon';
import { normalizeTimezone } from '@app/common/utils/timezone.util';

const MAX_RANGE_DAYS = 366;

/** Parse YYYY-MM-DD and validate format. */
export function parseIsoDateOnly(value: string): DateTime {
  const dt = DateTime.fromISO(value, { zone: 'utc' });
  if (!dt.isValid || dt.toISODate() !== value) {
    throw new Error(`Invalid date: ${value}`);
  }
  return dt.startOf('day');
}

/** Expand inclusive calendar dates between from and to in business timezone. */
export function expandInclusiveDateRange(
  fromDate: string,
  toDate: string,
  timezone: string,
): Date[] {
  const tz = normalizeTimezone(timezone);
  const start = DateTime.fromISO(fromDate, { zone: tz }).startOf('day');
  const end = DateTime.fromISO(toDate, { zone: tz }).startOf('day');

  if (!start.isValid || !end.isValid) {
    throw new Error('Invalid date range');
  }
  if (end < start) {
    throw new Error('toDate must be on or after fromDate');
  }

  const dayCount = Math.floor(end.diff(start, 'days').days) + 1;
  if (dayCount > MAX_RANGE_DAYS) {
    throw new Error(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);
  }

  const dates: Date[] = [];
  let current = start;
  while (current <= end) {
    dates.push(current.toUTC().toJSDate());
    current = current.plus({ days: 1 });
  }
  return dates;
}

export function resolveInclusiveToDate(
  fromDate: string,
  toDate?: string | null,
): string {
  return toDate?.trim() || fromDate;
}

export { MAX_RANGE_DAYS };
