import { DateTime } from "luxon";
import type { BusinessHoursSlot, DayOfWeek } from "@/features/business-hours/types";
import {
  DAYS_OF_WEEK,
  normalizeBusinessHoursSlots,
} from "@/features/business-hours/utils/default-business-hours";
import { parseDateKeyInTimezone } from "@/features/calendars/utils/timezone";

const LUXON_WEEKDAY_TO_DAY: Record<number, DayOfWeek> = {
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
  7: "SUNDAY",
};

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function resolveEffectiveWeeklyHours(
  businessSlots: BusinessHoursSlot[],
  staffSlots: BusinessHoursSlot[] | null | undefined,
): BusinessHoursSlot[] {
  const business = normalizeBusinessHoursSlots(businessSlots);
  if (!staffSlots?.length) {
    return business;
  }
  return normalizeBusinessHoursSlots(staffSlots);
}

export function dayOfWeekForDateKey(
  dateKey: string,
  timezone: string,
): DayOfWeek {
  const weekday = parseDateKeyInTimezone(dateKey, timezone).weekday;
  return LUXON_WEEKDAY_TO_DAY[weekday]!;
}

export function getWorkingWindowForDay(
  weeklyHours: BusinessHoursSlot[],
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

export type MinuteRange = { startMinutes: number; endMinutes: number };

/** Ranges to gray out on the calendar grid (outside working hours). */
export function getNonWorkingOverlayBlocks(
  window: { isEnabled: boolean; startMinutes: number; endMinutes: number },
  gridEndMinutes = 24 * 60,
): MinuteRange[] {
  if (!window.isEnabled) {
    return [{ startMinutes: 0, endMinutes: gridEndMinutes }];
  }
  const blocks: MinuteRange[] = [];
  if (window.startMinutes > 0) {
    blocks.push({ startMinutes: 0, endMinutes: window.startMinutes });
  }
  if (window.endMinutes < gridEndMinutes) {
    blocks.push({
      startMinutes: window.endMinutes,
      endMinutes: gridEndMinutes,
    });
  }
  return blocks;
}

export function isRangeOutsideWorkingWindow(
  startMinutes: number,
  endMinutes: number,
  window: { isEnabled: boolean; startMinutes: number; endMinutes: number },
): boolean {
  if (!window.isEnabled) return true;
  return startMinutes < window.startMinutes || endMinutes > window.endMinutes;
}

export function getEffectiveHoursForStaff(params: {
  dateKey: string;
  timezone: string;
  businessSlots: BusinessHoursSlot[];
  staffSlotsByUserId: Map<string, BusinessHoursSlot[] | null>;
  staffUserId?: string;
}): BusinessHoursSlot[] {
  const staffSlots = params.staffUserId
    ? params.staffSlotsByUserId.get(params.staffUserId)
    : null;
  return resolveEffectiveWeeklyHours(params.businessSlots, staffSlots ?? undefined);
}

export function getOutsideScheduleMessage(
  staffLabel: string,
): string {
  return `Appointment is outside ${staffLabel}'s schedule.`;
}

export function minutesRangeFromUtcIso(
  startAtIso: string,
  endAtIso: string,
  timezone: string,
  dateKey: string,
): { startMinutes: number; endMinutes: number } {
  const start = DateTime.fromISO(startAtIso, { zone: "utc" }).setZone(timezone);
  const end = DateTime.fromISO(endAtIso, { zone: "utc" }).setZone(timezone);
  return {
    startMinutes: start.hour * 60 + start.minute,
    endMinutes: end.hour * 60 + end.minute,
  };
}

export { DAYS_OF_WEEK };
