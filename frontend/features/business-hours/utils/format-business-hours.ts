import type { BusinessHoursSlot, DayOfWeek } from "@/features/business-hours/types";

/** JS `Date#getDay()` (0 = Sunday) → API day enum. */
export const JS_DAY_TO_DOW: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export function dayOfWeekFromDate(date: Date): DayOfWeek {
  return JS_DAY_TO_DOW[date.getDay()]!;
}

export function formatHmToDisplay(hm: string): string {
  const [hRaw, mRaw] = hm.split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (Number.isNaN(h) || Number.isNaN(m)) return hm;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatDayRowLabel(date: Date): string {
  const weekday = date.toLocaleDateString([], { weekday: "short" });
  const monthDay = `${date.getMonth() + 1}/${date.getDate()}`;
  return `${weekday} ${monthDay}`;
}

export function formatHoursSummary(slot: BusinessHoursSlot): string {
  if (!slot.isEnabled) return "Closed";
  return `${formatHmToDisplay(slot.startTime)} – ${formatHmToDisplay(slot.endTime)}`;
}

export function slotNeedsAttention(slot: BusinessHoursSlot): boolean {
  if (!slot.isEnabled) return false;
  if (!/^\d{2}:\d{2}$/.test(slot.startTime) || !/^\d{2}:\d{2}$/.test(slot.endTime)) {
    return true;
  }
  return slot.startTime >= slot.endTime;
}

export function weekdayLabel(dayOfWeek: DayOfWeek): string {
  const labels: Record<DayOfWeek, string> = {
    SUNDAY: "Sun",
    MONDAY: "Mon",
    TUESDAY: "Tue",
    WEDNESDAY: "Wed",
    THURSDAY: "Thu",
    FRIDAY: "Fri",
    SATURDAY: "Sat",
  };
  return labels[dayOfWeek];
}
