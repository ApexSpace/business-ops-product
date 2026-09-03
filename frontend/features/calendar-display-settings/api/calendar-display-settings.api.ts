import { api } from "@/lib/api/client";

export type CalendarZoomLevel = "SMALL" | "MEDIUM" | "LARGE";
export type WeekStartsOn = "SUNDAY" | "MONDAY";

export interface CalendarDisplaySettings {
  id: string;
  businessId: string;
  visibleStartTime: string;
  visibleEndTime: string;
  weekStartsOn: WeekStartsOn;
  zoomLevel: CalendarZoomLevel;
  showNormalCancellation: boolean;
  showLateCancellation: boolean;
  showNoShow: boolean;
  highContrastEnabled: boolean;
  showBufferOnCalendar: boolean;
  createdAt: string;
  updatedAt: string;
}

export function getCalendarDisplaySettings() {
  return api.get<CalendarDisplaySettings>("calendar-display-settings");
}

export function updateVisibleHours(body: {
  visibleStartTime: string;
  visibleEndTime: string;
}) {
  return api.patch<CalendarDisplaySettings>(
    "calendar-display-settings/visible-hours",
    body,
  );
}

export function updateWeekStart(body: { weekStartsOn: WeekStartsOn }) {
  return api.patch<CalendarDisplaySettings>(
    "calendar-display-settings/week-start",
    body,
  );
}

export function updateZoomLevel(body: { zoomLevel: CalendarZoomLevel }) {
  return api.patch<CalendarDisplaySettings>(
    "calendar-display-settings/zoom-level",
    body,
  );
}

export function updateCancelledVisibility(body: {
  showNormalCancellation: boolean;
  showLateCancellation: boolean;
  showNoShow: boolean;
}) {
  return api.patch<CalendarDisplaySettings>(
    "calendar-display-settings/cancelled-visibility",
    body,
  );
}

export function updateHighContrast(body: { highContrastEnabled: boolean }) {
  return api.patch<CalendarDisplaySettings>(
    "calendar-display-settings/high-contrast",
    body,
  );
}

export const ZOOM_LEVEL_OPTIONS: {
  value: CalendarZoomLevel;
  label: string;
}[] = [
  { value: "SMALL", label: "Small" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LARGE", label: "Large" },
];

export const WEEK_START_OPTIONS: { value: WeekStartsOn; label: string }[] = [
  { value: "SUNDAY", label: "Sunday" },
  { value: "MONDAY", label: "Monday" },
];

export function formatVisibleHoursLabel(start: string, end: string): string {
  return `${formatTimeLabel(start)} – ${formatTimeLabel(end)}`;
}

export function formatTimeLabel(value: string): string {
  if (value === "24:00") return "12:00 AM (midnight end)";
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0
    ? `${displayHour}:00 ${period}`
    : `${displayHour}:${minutesRaw} ${period}`;
}

export function formatZoomLevelLabel(level: CalendarZoomLevel): string {
  return ZOOM_LEVEL_OPTIONS.find((option) => option.value === level)?.label ?? level;
}

export function formatWeekStartLabel(value: WeekStartsOn): string {
  return WEEK_START_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatCancelledVisibilityLabel(settings: {
  showNormalCancellation: boolean;
  showLateCancellation: boolean;
  showNoShow: boolean;
}): string {
  const labels: string[] = [];
  if (settings.showNormalCancellation) labels.push("Normal cancellation");
  if (settings.showLateCancellation) labels.push("Late cancellation");
  if (settings.showNoShow) labels.push("No show");
  return labels.length > 0 ? labels.join(", ") : "None visible";
}

/** 15-minute increments from 00:00 through 24:00 */
export const TIME_OPTIONS = Array.from({ length: 97 }, (_, index) => {
  const totalMinutes = index * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const value =
    totalMinutes === 24 * 60
      ? "24:00"
      : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  return { value, label: formatTimeLabel(value) };
});
