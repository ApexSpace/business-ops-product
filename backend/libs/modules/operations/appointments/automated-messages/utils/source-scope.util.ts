import {
  AppointmentAutomatedMessageSourceScope,
  AppointmentSource,
} from '@prisma/client';

const ONLINE_SOURCES = new Set<AppointmentSource>([
  AppointmentSource.BOOKING_WIDGET,
  AppointmentSource.PUBLIC_LINK,
  AppointmentSource.EXPRESS,
]);

export function sourceMatchesScope(
  source: AppointmentSource | null | undefined,
  scope: AppointmentAutomatedMessageSourceScope,
): boolean {
  if (scope === AppointmentAutomatedMessageSourceScope.ALL) {
    return true;
  }

  const resolved = source ?? AppointmentSource.INTERNAL;

  if (scope === AppointmentAutomatedMessageSourceScope.ONLINE) {
    return ONLINE_SOURCES.has(resolved);
  }

  if (scope === AppointmentAutomatedMessageSourceScope.STAFF) {
    return resolved === AppointmentSource.INTERNAL;
  }

  return false;
}

export function offsetToHours(
  offsetValue: number,
  offsetUnit: 'DAYS' | 'HOURS',
): number {
  if (offsetUnit === 'DAYS') {
    return offsetValue * 24;
  }
  return offsetValue;
}
