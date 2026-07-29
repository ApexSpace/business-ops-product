import type { PublicBookingSlotDto } from '@app/modules/operations/public-booking/dto/public-booking.dto';

export type WaitlistServiceLineMetadata = {
  serviceId: string;
  staffId?: string | null;
};

export type WaitlistEntryMetadata = {
  serviceLines?: WaitlistServiceLineMetadata[];
  matchedOpenings?: PublicBookingSlotDto[];
  matchedAt?: string;
  dismissedAt?: string;
  bookedAppointmentId?: string;
};

export function parseWaitlistMetadata(
  metadata: unknown,
): WaitlistEntryMetadata {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  return metadata as WaitlistEntryMetadata;
}

export function hasMatchedOpenings(metadata: unknown): boolean {
  const parsed = parseWaitlistMetadata(metadata);
  return (parsed.matchedOpenings?.length ?? 0) > 0;
}
