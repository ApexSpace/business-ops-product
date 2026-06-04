import { api } from "@/lib/api/client";
import type { PaginatedResult } from "@/features/calendars/types";
import type { Calendar, CalendarDetail } from "@/features/calendars/schemas/calendar-profile";

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
  return api.patch<void>(`calendars/${id}/availability`, body);
}

export function updateCalendarStaff(id: string, body: Record<string, unknown>) {
  return api.patch<void>(`calendars/${id}/staff`, body);
}

export function getGoogleCalendarSyncStatus(calendarId: string) {
  return api.get<import("@/features/calendars/utils/google-calendar-sync").GoogleCalendarSyncStatus>(
    `calendars/${calendarId}/sync/status`,
  );
}
