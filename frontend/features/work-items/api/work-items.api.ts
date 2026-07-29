import { api } from "@/lib/api/client";
import type { PaginatedResult, WorkItem } from "@/features/work-items/types";

export const DEFAULT_WORK_ITEMS_API_BASE = "work-items";

export type WorkItemsListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  serviceId?: string;
  contactId?: string;
  assignedToId?: string;
};

function path(apiBase: string, ...segments: string[]) {
  return [apiBase, ...segments].filter(Boolean).join("/");
}

export async function listWorkItems(
  filters: WorkItemsListFilters = {},
  apiBase: string = DEFAULT_WORK_ITEMS_API_BASE,
): Promise<PaginatedResult<WorkItem>> {
  const { items, meta } = await api.getPaginated<WorkItem>(apiBase, {
    searchParams: {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      status: filters.status,
      serviceId: filters.serviceId,
      contactId: filters.contactId,
      assignedToId: filters.assignedToId,
    },
  });
  return { items, meta };
}

export function getWorkItem(
  id: string,
  apiBase: string = DEFAULT_WORK_ITEMS_API_BASE,
) {
  return api.get<WorkItem>(path(apiBase, id));
}

export function createWorkItem(
  body: Record<string, unknown>,
  apiBase: string = DEFAULT_WORK_ITEMS_API_BASE,
) {
  return api.post<WorkItem>(apiBase, body);
}

export function updateWorkItem(
  id: string,
  body: Record<string, unknown>,
  apiBase: string = DEFAULT_WORK_ITEMS_API_BASE,
) {
  return api.patch<WorkItem>(path(apiBase, id), body);
}

export function deleteWorkItem(
  id: string,
  apiBase: string = DEFAULT_WORK_ITEMS_API_BASE,
) {
  return api.delete<void>(`${path(apiBase, id)}?confirm=true`);
}
