import { BookingWaitlistStatus } from '@prisma/client';
import type { WaitlistEntryWithRelations } from '../repositories/waitlist.repository';
import type { WaitlistEntryResponseDto } from '../dto/waitlist.dto';
import {
  parseWaitlistMetadata,
  hasMatchedOpenings,
} from '../utils/waitlist-metadata.util';

function formatContactName(
  firstName: string | null,
  lastName: string | null,
): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || 'Client';
}

function formatStaffName(
  firstName: string | null,
  lastName: string | null,
): string {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

function formatPhone(
  countryCode: string | null,
  number: string | null,
): string | null {
  if (!number?.trim()) return null;
  return countryCode?.trim() ? `${countryCode} ${number}` : number;
}

export function toWaitlistEntryResponse(
  entry: WaitlistEntryWithRelations,
): WaitlistEntryResponseDto {
  const metadata = parseWaitlistMetadata(entry.metadata);
  const matchedOpenings = metadata.matchedOpenings ?? [];
  const hasOpening =
    entry.status === BookingWaitlistStatus.MATCHED &&
    matchedOpenings.length > 0;

  return {
    id: entry.id,
    businessId: entry.businessId,
    calendarId: entry.calendarId,
    calendarName: entry.calendar?.name ?? null,
    contact: {
      id: entry.contact.id,
      name: formatContactName(entry.contact.firstName, entry.contact.lastName),
      email: entry.contact.email,
      phone: formatPhone(
        entry.contact.phoneCountryCode,
        entry.contact.phoneNumber,
      ),
    },
    service: {
      id: entry.service.id,
      name: entry.service.name,
      durationMinutes: entry.service.durationMinutes,
      price: entry.service.price != null ? Number(entry.service.price) : null,
    },
    additionalServiceIds:
      metadata.serviceLines
        ?.slice(1)
        .map((line) => line.serviceId)
        .filter(Boolean) ?? [],
    staff: entry.staff
      ? {
          id: entry.staff.id,
          name: formatStaffName(entry.staff.firstName, entry.staff.lastName),
        }
      : null,
    preferredDate: entry.preferredDate.toISOString().slice(0, 10),
    preferredMorning: entry.preferredMorning,
    preferredAfternoon: entry.preferredAfternoon,
    preferredEvening: entry.preferredEvening,
    comments: entry.comments,
    status: entry.status,
    source: entry.source,
    matchedOpenings,
    hasOpening,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

export { hasMatchedOpenings };
