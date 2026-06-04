import { api } from "@/lib/api/client";
import type { PaginatedResult, Task } from "@/features/tasks/types";

export type TasksListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  contactId?: string;
  leadId?: string;
  assignedToId?: string;
  status?: string;
  priority?: string;
  dueFrom?: string;
  dueTo?: string;
};

export async function listTasks(
  filters: TasksListFilters = {},
): Promise<PaginatedResult<Task>> {
  const { items, meta } = await api.getPaginated<Task>("tasks", {
    searchParams: {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      contactId: filters.contactId,
      leadId: filters.leadId,
      assignedToId: filters.assignedToId,
      status: filters.status,
      priority: filters.priority,
      dueFrom: filters.dueFrom,
      dueTo: filters.dueTo,
    },
  });
  return { items, meta };
}

export function getTask(id: string) {
  return api.get<Task>(`tasks/${id}`);
}

export function createTask(body: Record<string, unknown>) {
  return api.post<Task>("tasks", body);
}

export function updateTask(id: string, body: Record<string, unknown>) {
  return api.patch<Task>(`tasks/${id}`, body);
}

export function deleteTask(id: string) {
  return api.delete<void>(`tasks/${id}?confirm=true`);
}

export function completeTask(id: string) {
  return api.patch<Task>(`tasks/${id}/complete`);
}

export function reopenTask(id: string) {
  return api.patch<Task>(`tasks/${id}/reopen`);
}
