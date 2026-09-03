import type {
  BusinessHoursSlot,
  DayOfWeek as BusinessDayOfWeek,
} from "@/features/business-hours/types";
import type {
  DayOfWeek,
  ResourceAvailabilitySlot,
} from "@/features/resources/types";
import {
  DEFAULT_RESOURCE_AVAILABILITY,
  RESOURCE_WEEKDAYS,
} from "@/features/resources/utils/resource-schedule.util";

export function resourceSlotsToBusinessHours(
  slots: ResourceAvailabilitySlot[],
): BusinessHoursSlot[] {
  return slots.map((slot) => ({
    dayOfWeek: slot.dayOfWeek as BusinessDayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isEnabled: slot.isEnabled,
  }));
}

export function businessHoursSlotToResource(
  slot: BusinessHoursSlot,
): ResourceAvailabilitySlot {
  return {
    dayOfWeek: slot.dayOfWeek as DayOfWeek,
    startTime: slot.startTime,
    endTime: slot.endTime,
    isEnabled: slot.isEnabled,
  };
}

export function mergeBusinessHoursDay(
  slots: ResourceAvailabilitySlot[],
  dayOfWeek: DayOfWeek,
  next: BusinessHoursSlot,
): ResourceAvailabilitySlot[] {
  const normalized =
    slots.length === RESOURCE_WEEKDAYS.length
      ? slots
      : DEFAULT_RESOURCE_AVAILABILITY.map((fallback) => {
          const existing = slots.find((s) => s.dayOfWeek === fallback.dayOfWeek);
          return existing ?? fallback;
        });

  return normalized.map((slot) =>
    slot.dayOfWeek === dayOfWeek
      ? businessHoursSlotToResource(next)
      : slot,
  );
}
