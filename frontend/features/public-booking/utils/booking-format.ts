import { DateTime } from "luxon";
import type { PublicBookingSlot } from "@/features/public-booking/schemas/public-booking";

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

export function formatDateLong(dateKey: string, timezone: string): string {
  return DateTime.fromISO(dateKey, { zone: timezone }).toFormat("cccc, LLL d, yyyy");
}

export function formatTimeRange(
  startAt: string,
  endAt: string,
  timezone: string,
): string {
  const start = DateTime.fromISO(startAt, { zone: "utc" }).setZone(timezone);
  const end = DateTime.fromISO(endAt, { zone: "utc" }).setZone(timezone);
  return `${start.toFormat("h:mm a")} – ${end.toFormat("h:mm a")}`;
}

export function formatSlotSummary(
  dateKey: string,
  slot: PublicBookingSlot,
  timezone: string,
  durationMinutes: number,
) {
  return {
    dateLabel: formatDateLong(dateKey, timezone),
    timeLabel: formatTimeRange(slot.startAt, slot.endAt, timezone),
    durationLabel: formatDuration(durationMinutes),
  };
}

export function formatLocationType(type: string): string {
  const labels: Record<string, string> = {
    PHYSICAL: "In person",
    PHONE_CALL: "Phone call",
    GOOGLE_MEET: "Google Meet",
    ZOOM: "Zoom",
    ONSITE: "On-site",
    CUSTOM: "Custom location",
  };
  return labels[type] ?? "Meeting";
}
