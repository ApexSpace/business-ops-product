import { z } from "zod";
import type { CalendarLocationType } from "@/features/calendars/schemas/calendar-profile";
import {
  formatDateInTimezone,
  formatTimeInTimezone,
  localDateTimeInputToUtc,
  utcToLocalDateTimeInputValue,
} from "@/features/calendars/utils/timezone";

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type AppointmentSource =
  | "INTERNAL"
  | "BOOKING_WIDGET"
  | "GOOGLE_SYNC"
  | "IMPORTED";

export interface Appointment {
  id: string;
  businessId: string;
  calendarId: string;
  contactId: string;
  serviceId: string | null;
  workItemId: string | null;
  assignedToId: string | null;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  source: AppointmentSource;
  locationType: CalendarLocationType | null;
  locationValue: string | null;
  notes: string | null;
  externalProvider: string | null;
  externalEventId: string | null;
  createdAt: string;
  updatedAt: string;
  calendar: { id: string; name: string; color: string | null };
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    email: string | null;
  };
  service: { id: string; name: string } | null;
  assignedTo: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  googleSyncWarning?: string | null;
}

export function getAppointmentSyncIndicator(appointment: Appointment): {
  label: string;
  variant: "google-import" | "google-sync" | "google-error";
} | null {
  if (appointment.googleSyncWarning) {
    return { label: "Sync error", variant: "google-error" };
  }
  if (appointment.source === "GOOGLE_SYNC") {
    return { label: "Google", variant: "google-import" };
  }
  if (
    appointment.externalProvider === "GOOGLE_CALENDAR" &&
    appointment.externalEventId
  ) {
    return { label: "Synced", variant: "google-sync" };
  }
  return null;
}

export const APPOINTMENT_STATUS_OPTIONS: {
  value: AppointmentStatus;
  label: string;
}[] = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No show" },
];

export const appointmentFormSchema = z
  .object({
    calendarId: z.string().uuid(),
    contactId: z.string().uuid(),
    serviceId: z.string().optional(),
    workItemId: z.string().optional(),
    assignedToId: z.string().optional(),
    title: z.string().min(1).max(255),
    description: z.string().max(5000).optional(),
    startAt: z.string().min(1),
    endAt: z.string().min(1),
    status: z.enum([
      "SCHEDULED",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ]),
    locationType: z
      .enum([
        "PHYSICAL",
        "PHONE_CALL",
        "GOOGLE_MEET",
        "ZOOM",
        "CUSTOM",
        "ONSITE",
      ])
      .optional(),
    locationValue: z.string().max(500).optional(),
    notes: z.string().max(5000).optional(),
  })
  .refine(
    (data) => new Date(data.endAt) > new Date(data.startAt),
    { message: "End must be after start", path: ["endAt"] },
  );

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export const appointmentFormDefaults: AppointmentFormValues = {
  calendarId: "",
  contactId: "",
  serviceId: "",
  workItemId: "",
  assignedToId: "",
  title: "",
  description: "",
  startAt: "",
  endAt: "",
  status: "SCHEDULED",
  locationType: "PHYSICAL",
  locationValue: "",
  notes: "",
};

export function appointmentToForm(
  a: Appointment,
  timezone?: string,
): AppointmentFormValues {
  const tzInput = (iso: string) =>
    timezone ? utcToLocalDateTimeInputValue(iso, timezone) : toLocalDatetimeInput(iso);
  return {
    calendarId: a.calendarId,
    contactId: a.contactId,
    serviceId: a.serviceId ?? "",
    workItemId: a.workItemId ?? "",
    assignedToId: a.assignedToId ?? "",
    title: a.title,
    description: a.description ?? "",
    startAt: tzInput(a.startAt),
    endAt: tzInput(a.endAt),
    status: a.status,
    locationType: a.locationType ?? "PHYSICAL",
    locationValue: a.locationValue ?? "",
    notes: a.notes ?? "",
  };
}

export function appointmentFormToApiBody(
  values: AppointmentFormValues,
  timezone?: string,
) {
  const toUtc = (local: string) =>
    timezone
      ? localDateTimeInputToUtc(local, timezone)
      : new Date(local).toISOString();
  return {
    calendarId: values.calendarId,
    contactId: values.contactId,
    serviceId: values.serviceId?.trim() || undefined,
    workItemId: values.workItemId?.trim() || undefined,
    assignedToId: values.assignedToId?.trim() || undefined,
    title: values.title.trim(),
    description: values.description?.trim() || undefined,
    startAt: toUtc(values.startAt),
    endAt: toUtc(values.endAt),
    status: values.status,
    locationType: values.locationType,
    locationValue: values.locationValue?.trim() || undefined,
    notes: values.notes?.trim() || undefined,
  };
}

export function formatAppointmentRange(
  startAt: string,
  endAt: string,
  timezone?: string,
): string {
  if (timezone) {
    const date = formatDateInTimezone(startAt, timezone);
    const startTime = formatTimeInTimezone(startAt, timezone);
    const endTime = formatTimeInTimezone(endAt, timezone);
    return `${date} · ${startTime} – ${endTime}`;
  }
  const start = new Date(startAt);
  const end = new Date(endAt);
  const date = start.toLocaleDateString();
  const startTime = start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const endTime = end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} · ${startTime} – ${endTime}`;
}

export function formatAppointmentStatus(status: AppointmentStatus): string {
  return (
    APPOINTMENT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
  );
}

export function getContactDisplayName(contact: Appointment["contact"]): string {
  return (
    contact.displayName ??
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") ??
    contact.email ??
    "Contact"
  );
}

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
