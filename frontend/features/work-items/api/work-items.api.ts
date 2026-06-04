import { api } from "@/lib/api/client";
import type { PaginatedResult, WorkItem } from "@/features/work-items/types";

export type WorkItemsListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  serviceId?: string;
  contactId?: string;
  assignedToId?: string;
};

export async function listWorkItems(
  filters: WorkItemsListFilters = {},
): Promise<PaginatedResult<WorkItem>> {
  const { items, meta } = await api.getPaginated<WorkItem>("work-items", {
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

export function getWorkItem(id: string) {
  return api.get<WorkItem>(`work-items/${id}`);
}

export function createWorkItem(body: Record<string, unknown>) {
  return api.post<WorkItem>("work-items", body);
}

export function updateWorkItem(id: string, body: Record<string, unknown>) {
  return api.patch<WorkItem>(`work-items/${id}`, body);
}

export function deleteWorkItem(id: string) {
  return api.delete<void>(`work-items/${id}?confirm=true`);
}
