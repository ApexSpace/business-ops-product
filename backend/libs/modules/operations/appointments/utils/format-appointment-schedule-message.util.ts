import { DateTime } from 'luxon';

export function formatAppointmentTimeRange(
  startAt: Date,
  endAt: Date,
  timezone: string,
): string {
  const zone = timezone.trim() || 'UTC';
  const start = DateTime.fromJSDate(startAt, { zone: 'utc' }).setZone(zone);
  const end = DateTime.fromJSDate(endAt, { zone: 'utc' }).setZone(zone);

  if (start.toISODate() === end.toISODate()) {
    return `${start.toFormat('ccc, LLL d')} from ${start.toFormat('h:mm a')} to ${end.toFormat('h:mm a')}`;
  }

  return `${start.toFormat("ccc, LLL d 'at' h:mm a")} to ${end.toFormat("ccc, LLL d 'at' h:mm a")}`;
}

export function formatStaffScheduleConflictMessage(
  startAt: Date,
  endAt: Date,
  timezone: string,
): string {
  const range = formatAppointmentTimeRange(startAt, endAt, timezone);
  return `This staff member is already booked ${range}. Please choose a different time.`;
}
