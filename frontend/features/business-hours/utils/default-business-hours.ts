import type { BusinessHoursSlot, DayOfWeek } from "@/features/business-hours/types";

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export function defaultBusinessHoursSlots(): BusinessHoursSlot[] {
  return DAYS_OF_WEEK.map((dayOfWeek) => ({
    dayOfWeek,
    startTime: "09:00",
    endTime: "17:00",
    isEnabled: dayOfWeek !== "SATURDAY" && dayOfWeek !== "SUNDAY",
  }));
}

export function normalizeBusinessHoursSlots(
  slots: BusinessHoursSlot[],
): BusinessHoursSlot[] {
  const byDay = new Map(slots.map((s) => [s.dayOfWeek, s]));
  return DAYS_OF_WEEK.map((dayOfWeek) => {
    const row = byDay.get(dayOfWeek);
    if (row) return row;
    const fallback = defaultBusinessHoursSlots().find(
      (d) => d.dayOfWeek === dayOfWeek,
    );
    return fallback!;
  });
}
