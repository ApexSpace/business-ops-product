import { api } from "@/lib/api/client";
import type { PaginatedResult } from "@/lib/types/shared";
import type {
  TimeCardDetail,
  TimeCardListItem,
  TimeCardsListFilters,
  UpsertTimeCardBody,
} from "@/features/time-clock/types";

export async function listTimeCards(
  filters: TimeCardsListFilters = {},
): Promise<PaginatedResult<TimeCardListItem>> {
  const { items, meta } = await api.getPaginated<TimeCardListItem>(
    "time-cards",
    {
      searchParams: {
        page: filters.page,
        limit: filters.limit,
        staffId: filters.staffId,
        timePeriod: filters.timePeriod,
        startDate: filters.startDate,
        endDate: filters.endDate,
        sortBy: filters.sortBy,
      },
    },
  );
  return { items, meta };
}

export function getTimeCard(id: string) {
  return api.get<TimeCardDetail>(`time-cards/${id}`);
}

export function createTimeCard(body: UpsertTimeCardBody & { staffId: string; date: string; clockInTime: string }) {
  return api.post<TimeCardDetail>("time-cards", body);
}

export function updateTimeCard(id: string, body: UpsertTimeCardBody) {
  return api.patch<TimeCardDetail>(`time-cards/${id}`, body);
}

export function deleteTimeCard(id: string) {
  return api.delete<void>(`time-cards/${id}`);
}
