import { BusinessHours, DayOfWeek } from '@prisma/client';
import {
  DAYS_OF_WEEK_ORDER,
  DEFAULT_BUSINESS_HOURS,
  type BusinessHoursSlotInput,
} from '../constants/default-business-hours';

export function normalizeBusinessHoursSlots(
  rows: BusinessHours[],
): BusinessHoursSlotInput[] {
  const byDay = new Map(rows.map((r) => [r.dayOfWeek, r]));
  return DAYS_OF_WEEK_ORDER.map((dayOfWeek) => {
    const row = byDay.get(dayOfWeek);
    if (row) {
      return {
        dayOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
        isEnabled: row.isEnabled,
      };
    }
    const fallback = DEFAULT_BUSINESS_HOURS.find(
      (d) => d.dayOfWeek === dayOfWeek,
    );
    return (
      fallback ?? {
        dayOfWeek,
        startTime: '09:00',
        endTime: '17:00',
        isEnabled: false,
      }
    );
  });
}

export function assertValidBusinessHoursSlots(
  slots: BusinessHoursSlotInput[],
): void {
  if (slots.length !== DAYS_OF_WEEK_ORDER.length) {
    throw new Error('Business hours must include all seven days');
  }
  const seen = new Set<DayOfWeek>();
  for (const slot of slots) {
    if (seen.has(slot.dayOfWeek)) {
      throw new Error(`Duplicate day: ${slot.dayOfWeek}`);
    }
    seen.add(slot.dayOfWeek);
    if (
      !/^\d{2}:\d{2}$/.test(slot.startTime) ||
      !/^\d{2}:\d{2}$/.test(slot.endTime)
    ) {
      throw new Error(`Invalid time format for ${slot.dayOfWeek}`);
    }
    if (slot.isEnabled && slot.startTime >= slot.endTime) {
      throw new Error(`${slot.dayOfWeek}: start time must be before end time`);
    }
  }
}
