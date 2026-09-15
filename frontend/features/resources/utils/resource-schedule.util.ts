import type { DayOfWeek, ResourceAvailabilitySlot } from "@/features/resources/types";

export const RESOURCE_WEEKDAYS: { key: DayOfWeek; label: string }[] = [
  { key: "MONDAY", label: "Monday" },
  { key: "TUESDAY", label: "Tuesday" },
  { key: "WEDNESDAY", label: "Wednesday" },
  { key: "THURSDAY", label: "Thursday" },
  { key: "FRIDAY", label: "Friday" },
  { key: "SATURDAY", label: "Saturday" },
  { key: "SUNDAY", label: "Sunday" },
];

export const DEFAULT_RESOURCE_AVAILABILITY: ResourceAvailabilitySlot[] =
  RESOURCE_WEEKDAYS.map((day, index) => ({
    dayOfWeek: day.key,
    startTime: "09:00",
    endTime: index < 5 ? "17:00" : "12:00",
    isEnabled: index < 5,
  }));

export function resourceTypeLabel(type: string): string {
  switch (type) {
    case "ROOM":
      return "Room";
    case "EQUIPMENT":
      return "Equipment";
    case "CONSUMABLE":
      return "Consumable";
    default:
      return type;
  }
}

export function normalizeAvailabilitySlots(
  slots: ResourceAvailabilitySlot[] | undefined,
): ResourceAvailabilitySlot[] {
  if (!slots?.length) {
    return DEFAULT_RESOURCE_AVAILABILITY;
  }
  const byDay = new Map(slots.map((slot) => [slot.dayOfWeek, slot]));
  return RESOURCE_WEEKDAYS.map(({ key }) => {
    const existing = byDay.get(key);
    return (
      existing ?? {
        dayOfWeek: key,
        startTime: "09:00",
        endTime: "17:00",
        isEnabled: false,
      }
    );
  });
}
