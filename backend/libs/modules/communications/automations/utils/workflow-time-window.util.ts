import type { WorkflowSettings } from '../types/workflow.types';

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function currentMinutesInTimezone(now: Date, timezone: string | null): number {
  if (!timezone?.trim()) {
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    return hour * 60 + minute;
  } catch {
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
}

function isWithinWindow(
  currentMinutes: number,
  startMinutes: number,
  endMinutes: number,
): boolean {
  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function minutesUntilWindowOpen(
  currentMinutes: number,
  startMinutes: number,
  endMinutes: number,
): number {
  if (isWithinWindow(currentMinutes, startMinutes, endMinutes)) {
    return 0;
  }
  if (currentMinutes < startMinutes) {
    return startMinutes - currentMinutes;
  }
  return 24 * 60 - currentMinutes + startMinutes;
}

/** Returns delay in ms until the next allowed send window, or 0 if sending is allowed now. */
export function msUntilAllowedTimeWindow(
  settings: WorkflowSettings,
  now = new Date(),
): number {
  if (!settings.timeWindowEnabled || !settings.timeWindow) {
    return 0;
  }

  const startMinutes = parseTimeToMinutes(settings.timeWindow.start);
  const endMinutes = parseTimeToMinutes(settings.timeWindow.end);
  if (startMinutes == null || endMinutes == null) {
    return 0;
  }

  const currentMinutes = currentMinutesInTimezone(now, settings.timezone);
  const waitMinutes = minutesUntilWindowOpen(
    currentMinutes,
    startMinutes,
    endMinutes,
  );
  return waitMinutes * 60_000;
}
