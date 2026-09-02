import type { StaffWorkException } from '@prisma/client';

/** Full-day unavailable: no time window, marked unavailable. */
export function isFullDayUnavailable(
  row: Pick<StaffWorkException, 'isUnavailable' | 'startTime' | 'endTime'>,
): boolean {
  return (
    row.isUnavailable &&
    (row.startTime == null || row.startTime === '') &&
    (row.endTime == null || row.endTime === '')
  );
}

/** Partial-day block: has start/end times or is available override with times. */
export function isPartialDayException(
  row: Pick<StaffWorkException, 'startTime' | 'endTime'>,
): boolean {
  const hasStart = row.startTime != null && row.startTime !== '';
  const hasEnd = row.endTime != null && row.endTime !== '';
  return hasStart || hasEnd;
}
