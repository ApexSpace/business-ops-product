import { api } from "@/lib/api/client";

export interface SchedulingSettings {
  slotIntervalMinutes: number;
  bufferTimeEnabled: boolean;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  showBufferOnCalendar: boolean;
  processingTimeEnabled: boolean;
  rebookingJumpWeeks: number[];
}

export type UpdateSchedulingSettingsBody = Partial<SchedulingSettings>;

export function getSchedulingSettings() {
  return api.get<SchedulingSettings>("scheduling-settings");
}

export function updateSchedulingSettings(body: UpdateSchedulingSettingsBody) {
  return api.patch<SchedulingSettings>("scheduling-settings", body);
}

export const SLOT_INTERVAL_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const;

export const REBOOKING_WEEK_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export function formatSlotIntervalLabel(minutes: number): string {
  if (minutes === 60) return "1 hour";
  return `${minutes} minutes`;
}

export function formatRebookingJumpWeeksLabel(weeks: number[]): string {
  if (weeks.length === 0) return "None selected";
  return weeks
    .map((week) => (week === 1 ? "1 Week" : `${week} Weeks`))
    .join(", ");
}
