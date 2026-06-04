import { api } from "@/lib/api/client";
import type { Appointment } from "@/features/appointments/schemas/appointment-profile";
import type { PaginatedResult } from "@/features/appointments/types";

export type AppointmentsListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  contactId?: string;
  calendarId?: string;
  assignedToId?: string;
  status?: string;
  startFrom?: string;
  startTo?: string;
};

export async function listAppointments(
  filters: AppointmentsListFilters = {},
): Promise<PaginatedResult<Appointment>> {
  const { items, meta } = await api.getPaginated<Appointment>("appointments", {
    searchParams: {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      contactId: filters.contactId,
      calendarId: filters.calendarId,
      assignedToId: filters.assignedToId,
      status: filters.status,
      startFrom: filters.startFrom,
      startTo: filters.startTo,
    },
  });
  return { items, meta };
}

export function getAppointment(id: string) {
  return api.get<Appointment>(`appointments/${id}`);
}

export function createAppointment(body: Record<string, unknown>) {
  return api.post<Appointment>("appointments", body);
}

export function updateAppointment(id: string, body: Record<string, unknown>) {
  return api.patch<Appointment>(`appointments/${id}`, body);
}

export function deleteAppointment(id: string) {
  return api.delete<void>(`appointments/${id}?confirm=true`);
}
