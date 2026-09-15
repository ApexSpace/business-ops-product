import { DateTime } from 'luxon';
import type { PublicBookingSlotDto } from '@app/modules/operations/public-booking/dto/public-booking.dto';

export function filterSlotsByTimePreferences(
  slots: PublicBookingSlotDto[],
  preferences: {
    preferredMorning: boolean;
    preferredAfternoon: boolean;
    preferredEvening: boolean;
  },
  timezone: string,
): PublicBookingSlotDto[] {
  const { preferredMorning, preferredAfternoon, preferredEvening } =
    preferences;
  if (!preferredMorning && !preferredAfternoon && !preferredEvening) {
    return slots;
  }

  return slots.filter((slot) => {
    const start = DateTime.fromISO(slot.startAt, { zone: timezone });
    if (!start.isValid) return false;
    const hour = start.hour;
    if (preferredMorning && hour < 12) return true;
    if (preferredAfternoon && hour >= 12 && hour < 17) return true;
    if (preferredEvening && hour >= 17) return true;
    return false;
  });
}
