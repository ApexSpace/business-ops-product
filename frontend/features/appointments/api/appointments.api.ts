import { api } from "@/lib/api/client";
import type {
  Appointment,
  AppointmentActivityItem,
  AppointmentStatus,
} from "@/features/appointments/schemas/appointment-profile";
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
  return { items, meta,
};
}

export function getAppointment(id: string) {
  return api.get<Appointment>(`appointments/${id}`);
}

export function getAppointmentActivity(id: string) {
  return api.get<{ items: AppointmentActivityItem[] }>(
    `appointments/${id}/activity`,
  );
}

export type AppointmentPhotoItem = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  downloadUrl: string;
  expiresIn: number;
};

export function getAppointmentPhotos(id: string) {
  return api.get<{ items: AppointmentPhotoItem[] }>(
    `appointments/${id}/photos`,
  );
}

export function createAppointment(body: Record<string, unknown>) {
  return api.post<Appointment>("appointments", body);
}

export function createExpressAppointment(body: {
  contactId?: string;
  guestFirstName?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestPhoneCountryCode?: string;
  serviceId: string;
  startAt: string;
  endAt?: string;
  assignedToId: string;
  calendarId?: string | null;
  expressRequireCard?: boolean;
  expressRequireDeposit?: boolean;
  expressTimeLimitMinutes?: number;
}) {
  return api.post<Appointment>("appointments/express", body);
}

export function resendExpressAppointment(id: string) {
  return api.post<Appointment>(`appointments/${id}/express/resend`);
}

export function staffCompleteExpressAppointment(id: string) {
  return api.post<Appointment>(`appointments/${id}/express/staff-complete`);
}

export function updateAppointment(id: string, body: Record<string, unknown>) {
  return api.patch<Appointment>(`appointments/${id}`, body);
}

export function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  return api.patch<Appointment>(`appointments/${id}/status`, { status });
}

export function notifyAppointmentClient(id: string) {
  return api.post<Appointment>(`appointments/${id}/notify`);
}

export function deleteAppointment(id: string) {
  return api.delete<void>(`appointments/${id}?confirm=true`);
}

/** Staff who can provide a service (enabled ServiceStaff rows; all members if none assigned). */
export function listAppointmentServiceStaff(serviceId: string) {
  return api.get<{ items: Array<{ id: string; label: string }> }>(
    `checkouts/picker/services/${serviceId}/staff`,
  );
}
