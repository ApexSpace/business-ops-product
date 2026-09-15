import { api } from "@/lib/api/client";
import type { SearchParamValue } from "@/lib/api/client";
import type {
  WaitlistBookResult,
  WaitlistEntry,
  WaitlistListFilters,
  WaitlistSummary,
} from "@/features/waitlist/types";

export function listWaitlistEntries(filters: WaitlistListFilters = {}) {
  return api.getPaginated<WaitlistEntry>("waitlist", {
    searchParams: filters as Record<string, SearchParamValue>,
  });
}

export function getWaitlistSummary() {
  return api.get<WaitlistSummary>("waitlist/summary");
}

export function getWaitlistEntry(id: string) {
  return api.get<WaitlistEntry>(`waitlist/${id}`);
}

export function dismissWaitlistMatch(id: string) {
  return api.patch<WaitlistEntry>(`waitlist/${id}/dismiss`);
}

export function bookFromWaitlist(
  id: string,
  body: { startAt: string; calendarId?: string; staffId?: string },
) {
  return api.post<WaitlistBookResult>(`waitlist/${id}/book`, body);
}

export function cancelWaitlistEntry(id: string) {
  return api.patch<WaitlistEntry>(`waitlist/${id}/cancel`);
}
