import { BusinessHours, DayOfWeek, StaffWorkSchedule } from '@prisma/client';
import { DateTime } from 'luxon';
import { normalizeBusinessHoursSlots } from './business-hours.util';

export type WeeklyHoursSlot = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
};

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

const LUXON_WEEKDAY_TO_DAY: Record<number, DayOfWeek> = {
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
  7: 'SUNDAY',
};

/** Staff custom schedule when present; otherwise business hours. */
export function resolveEffectiveWeeklyHours(
  businessHours: BusinessHours[],
  staffSchedules?: StaffWorkSchedule[],
): WeeklyHoursSlot[] {
  const business = normalizeBusinessHoursSlots(businessHours);
  if (!staffSchedules?.length) {
    return business;
  }
  return normalizeBusinessHoursSlots(staffSchedules);
}

export function dayOfWeekForDateKey(
  dateKey: string,
  timezone: string,
): DayOfWeek {
  const weekday = DateTime.fromISO(dateKey, { zone: timezone }).weekday;
  return LUXON_WEEKDAY_TO_DAY[weekday];
}

export function getWorkingWindowForDay(
  weeklyHours: WeeklyHoursSlot[],
  dayOfWeek: DayOfWeek,
): { isEnabled: boolean; startMinutes: number; endMinutes: number } {
  const weekly = weeklyHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!weekly?.isEnabled) {
    return { isEnabled: false, startMinutes: 0, endMinutes: 0 };
  }
  return {
    isEnabled: true,
    startMinutes: parseTimeToMinutes(weekly.startTime),
    endMinutes: parseTimeToMinutes(weekly.endTime),
  };
}

export function isRangeOutsideWorkingWindow(
  startMinutes: number,
  endMinutes: number,
  window: { isEnabled: boolean; startMinutes: number; endMinutes: number },
): boolean {
  if (!window.isEnabled) return true;
  return startMinutes < window.startMinutes || endMinutes > window.endMinutes;
}
