import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import type {
  CalendarZoomLevel,
  WeekStartsOn,
} from "@/features/calendar-display-settings/api/calendar-display-settings.api";

export function slotHeightForZoom(zoomLevel: CalendarZoomLevel): number {
  switch (zoomLevel) {
    case "SMALL":
      return 20;
    case "MEDIUM":
      return 30;
    case "LARGE":
      return 40;
    default:
      return 30;
  }
}

/** Parse HH:mm or 24:00 into minutes from midnight. */
export function parseVisibleTimeToMinutes(value: string): number {
  const trimmed = value.trim();
  if (trimmed === "24:00") return 24 * 60;
  const [hoursRaw, minutesRaw] = trimmed.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return 0;
  }
  return hours * 60 + minutes;
}

/** Luxon weekday: Mon=1 … Sun=7 */
export function daysFromWeekStart(
  weekday: number,
  weekStartsOn: WeekStartsOn,
): number {
  if (weekStartsOn === "MONDAY") {
    return weekday === 7 ? 6 : weekday - 1;
  }
  return weekday === 7 ? 0 : weekday;
}

type CancellationVisibility = {
  showNormalCancellation: boolean;
  showLateCancellation: boolean;
  showNoShow: boolean;
};

function readMetadataRecord(
  metadata: Appointment["metadata"],
): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object") return {};
  return metadata as Record<string, unknown>;
}

export function shouldShowCancelledAppointment(
  appointment: Appointment,
  visibility: CancellationVisibility,
): boolean {
  if (appointment.status === "NO_SHOW") {
    return visibility.showNoShow;
  }

  if (appointment.status !== "CANCELLED") {
    return true;
  }

  const meta = readMetadataRecord(appointment.metadata);
  const cancellationType =
    typeof meta.cancellationType === "string" ? meta.cancellationType : "normal";
  const isLate =
    cancellationType === "late" || meta.lateCancellation === true;

  if (isLate) {
    return visibility.showLateCancellation;
  }

  return visibility.showNormalCancellation;
}

export function filterAppointmentsForCalendarDisplay<
  T extends Appointment,
>(appointments: T[], visibility: CancellationVisibility): T[] {
  return appointments.filter((appointment) =>
    shouldShowCancelledAppointment(appointment, visibility),
  );
}

/** Mobile week view shows Mon–Wed for Sunday-start weeks (indexes 1–3). */
export function getMobileWeekDateKeys(
  allWeekKeys: string[],
  weekStartsOn: WeekStartsOn,
  visibleDayCount: number,
): string[] {
  const startIndex = weekStartsOn === "MONDAY" ? 0 : 1;
  return allWeekKeys.slice(startIndex, startIndex + visibleDayCount);
}

export function weekdayLabelsForWeekStart(
  weekStartsOn: WeekStartsOn,
): string[] {
  const sundayStart = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  if (weekStartsOn === "MONDAY") {
    return [...sundayStart.slice(1), sundayStart[0]!];
  }
  return sundayStart;
}

export function trailingDaysToWeekEnd(
  weekday: number,
  weekStartsOn: WeekStartsOn,
): number {
  if (weekStartsOn === "MONDAY") {
    return weekday === 7 ? 0 : 7 - weekday;
  }
  return weekday === 7 ? 6 : 6 - weekday;
}

export function monthWeekdayLabelsForWeekStart(
  weekStartsOn: WeekStartsOn,
): string[] {
  const sundayStart = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (weekStartsOn === "MONDAY") {
    return [...sundayStart.slice(1), sundayStart[0]!];
  }
  return sundayStart;
}
