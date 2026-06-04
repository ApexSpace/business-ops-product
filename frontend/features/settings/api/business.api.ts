import { api } from "@/lib/api/client";
import type {
  Business,
  BusinessDashboardStats,
  BusinessMember,
  PaginatedResult,
} from "@/features/settings/types";

export function getCurrentBusiness() {
  return api.get<Business>("businesses/current");
}

export type BusinessMembersListFilters = {
  page?: number;
  limit?: number;
  search?: string;
};

export async function listBusinessMembers(
  filters: BusinessMembersListFilters = {},
): Promise<PaginatedResult<BusinessMember>> {
  const { items, meta } = await api.getPaginated<BusinessMember>(
    "businesses/current/members",
    {
      searchParams: {
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
      },
    },
  );
  return { items, meta };
}

export function inviteBusinessMember(body: Record<string, unknown>) {
  return api.post<void>("businesses/current/members/invite", body);
}

export function updateCurrentBusiness(body: Record<string, unknown>) {
  return api.patch<Business>("businesses/current", body);
}

export function getBusinessDashboardStats() {
  return api.get<BusinessDashboardStats>("businesses/current/dashboard-stats");
}
