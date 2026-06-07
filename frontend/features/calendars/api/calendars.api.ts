import { api } from "@/lib/api/client";
import type { PaginatedResult } from "@/features/calendars/types";
import type {
  Calendar,
  CalendarDetail,
  CalendarStatus,
} from "@/features/calendars/schemas/calendar-profile";

export type CalendarsListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};

export async function listCalendars(
  filters: CalendarsListFilters = {},
): Promise<PaginatedResult<Calendar>> {
  const { items, meta } = await api.getPaginated<Calendar>("calendars", {
    searchParams: {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      status: filters.status,
    },
  });
  return { items, meta };
}

export function getCalendar(id: string) {
  return api.get<CalendarDetail>(`calendars/${id}`);
}

export function createCalendar(body: Record<string, unknown>) {
  return api.post<Calendar>("calendars", body);
}

export function updateCalendar(id: string, body: Record<string, unknown>) {
  return api.patch<Calendar>(`calendars/${id}`, body);
}

export function deleteCalendar(id: string) {
  return api.delete<void>(`calendars/${id}?confirm=true`);
}

export function updateCalendarAvailability(
  id: string,
  body: Record<string, unknown>,
) {
  return api.put<void>(`calendars/${id}/availability`, body);
}

export function addCalendarStaff(id: string, body: Record<string, unknown>) {
  return api.post<void>(`calendars/${id}/staff`, body);
}

/** @deprecated Use addCalendarStaff */
export const updateCalendarStaff = addCalendarStaff;

export function getGoogleCalendarSyncStatus(calendarId: string) {
  return api.get<import("@/features/calendars/utils/google-calendar-sync").GoogleCalendarSyncStatus>(
    `calendars/${calendarId}/sync/status`,
  );
}

export function listCalendarExceptions(calendarId: string) {
  return api.get<
    import("@/features/calendars/schemas/calendar-profile").CalendarException[]
  >(`calendars/${calendarId}/exceptions`);
}

export function createCalendarException(
  calendarId: string,
  body: {
    date: string;
    isUnavailable?: boolean;
    startTime?: string;
    endTime?: string;
    reason?: string;
  },
) {
  return api.post<
    import("@/features/calendars/schemas/calendar-profile").CalendarException
  >(`calendars/${calendarId}/exceptions`, body);
}

export function deleteCalendarException(
  calendarId: string,
  exceptionId: string,
) {
  return api.delete<void>(`calendars/${calendarId}/exceptions/${exceptionId}`);
}

/** Toggle public booking from list/details without full form save. */
export function setCalendarPublicBooking(
  id: string,
  enabled: boolean,
  extras?: Record<string, unknown>,
) {
  return updateCalendar(id, {
    publicBookingEnabled: enabled,
    ...extras,
  });
}

export function calendarStatusLabel(status: CalendarStatus): string {
  return status === "ACTIVE" ? "Active" : "Disabled";
}

export function formatCalendarTableDate(
  iso: string | null | undefined,
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
