import { api } from "@/lib/api/client";
import type { PaginatedResult, Service } from "@/features/settings/types";

export type ServicesListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
};

export async function listServices(
  filters: ServicesListFilters = {},
): Promise<PaginatedResult<Service>> {
  const { items, meta } = await api.getPaginated<Service>("services", {
    searchParams: {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      status: filters.status,
    },
  });
  return { items, meta };
}

export function getService(id: string) {
  return api.get<Service>(`services/${id}`);
}

export function createService(body: Record<string, unknown>) {
  return api.post<Service>("services", body);
}

export function updateService(id: string, body: Record<string, unknown>) {
  return api.patch<Service>(`services/${id}`, body);
}

export function deleteService(id: string) {
  return api.delete<void>(`services/${id}?confirm=true`);
}
