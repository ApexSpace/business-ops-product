import { z } from "zod";
import type { CalendarLocationType } from "@/features/calendars/schemas/calendar-profile";
import {
  formatDateInTimezone,
  formatTimeInTimezone,
  localDateTimeInputToUtc,
  utcToLocalDateTimeInputValue,
} from "@/features/calendars/utils/timezone";

export type AppointmentStatus =
  | "PENDING_COMPLETION"
  | "UNCONFIRMED"
  | "CONFIRMED"
  | "WAITING"
  | "IN_SERVICE"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type AppointmentSource =
  | "INTERNAL"
  | "BOOKING_WIDGET"
  | "PUBLIC_LINK"
  | "EXPRESS"
  | "GOOGLE_SYNC"
  | "IMPORTED";

export interface AppointmentServiceLine {
  id: string;
  serviceId: string;
  assignedToId: string | null;
  startAt: string | null;
  durationMinutes: number | null;
  price: string | null;
  sortOrder: number;
  service: {
    id: string;
    name: string;
    durationMinutes: number;
    price: string | null;
    hasBufferTime?: boolean;
    bufferBeforeMinutes?: number;
    bufferAfterMinutes?: number;
  };
  assignedTo: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

export interface AppointmentUserSummary {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export interface AppointmentActivityItem {
  id: string;
  action: string;
  createdAt: string;
  actor: AppointmentUserSummary | null;
  metadata?: Record<string, unknown> | null;
}

export interface Appointment {
  id: string;
  businessId: string;
  calendarId: string;
  contactId: string | null;
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
  calendar: { id: string; name: string; color: string | null,
};
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    email: string | null;
    phoneNumber: string | null;
    createdAt: string;
  } | null;
  service: { id: string; name: string } | null;
  services: AppointmentServiceLine[];
  assignedTo: AppointmentUserSummary | null;
  createdBy: AppointmentUserSummary | null;
  relatedCheckoutId: string | null;
  relatedCheckoutStatus: string | null;
  waitingNotifiedAt: string | null;
  guestFirstName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  guestPhoneCountryCode?: string | null;
  expressBookingExpiresAt?: string | null;
  expressBookingCompletedAt?: string | null;
  expressBookingPending?: boolean;
  expressRequireCard?: boolean | null;
  expressRequireDeposit?: boolean | null;
  expressTimeLimitMinutes?: number | null;
  googleSyncWarning?: string | null;
  scheduleWarning?: string | null;
  photoFileIds?: string[];
  hasPhotos?: boolean;
  isTimeBlock?: boolean;
}

export function isAppointmentTimeBlock(appointment: Appointment): boolean {
  if (appointment.isTimeBlock === true) return true;
  if (appointment.isTimeBlock === false) return false;
  return (
    !appointment.contactId &&
    !appointment.serviceId &&
    (appointment.services?.length ?? 0) === 0
  );
}

export function getAppointmentSyncIndicator(appointment: Appointment): {
  label: string;
  variant: "google-import" | "google-sync" | "google-error";
} | null {
  if (appointment.googleSyncWarning) {
    return { label: "Sync error", variant: "google-error",
};
  }
  if (appointment.source === "GOOGLE_SYNC") {
    return { label: "Google", variant: "google-import",
};
  }
  if (
    appointment.externalProvider === "GOOGLE_CALENDAR" &&
    appointment.externalEventId
  ) {
    return { label: "Synced", variant: "google-sync",
};
  }
  return null;
}

export const APPOINTMENT_LIFECYCLE_STATUS_OPTIONS: {
  value: AppointmentStatus;
  label: string;
}[] = [
  { value: "PENDING_COMPLETION", label: "Pending completion" },
  { value: "UNCONFIRMED", label: "Unconfirmed" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "WAITING", label: "Waiting" },
  { value: "IN_SERVICE", label: "In Service" },
  { value: "COMPLETED", label: "Closed" },
];

export const APPOINTMENT_STATUS_OPTIONS = APPOINTMENT_LIFECYCLE_STATUS_OPTIONS;

export const APPOINTMENT_FILTER_STATUS_OPTIONS: {
  value: AppointmentStatus;
  label: string;
}[] = [
  ...APPOINTMENT_LIFECYCLE_STATUS_OPTIONS,
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" },
];

export const appointmentServiceLineSchema = z.object({
  serviceId: z.string().uuid(),
  assignedToId: z.string().uuid().optional(),
  startAt: z.string().optional(),
  durationMinutes: z.number().int().min(1).optional(),
});

export const appointmentCreateSchema = z.object({
  calendarId: z.string().uuid(),
  contactId: z.string().uuid(),
  assignedToId: z.string().uuid().optional(),
  title: z.string().min(1).max(255),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  notes: z.string().max(5000).optional(),
  status: z
    .enum([
      "UNCONFIRMED",
      "CONFIRMED",
      "WAITING",
      "IN_SERVICE",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ])
    .optional(),
  services: z.array(appointmentServiceLineSchema).min(1, "Select at least one service"),
});

export type AppointmentCreateValues = z.infer<typeof appointmentCreateSchema>;

export const appointmentFormSchema = z
  .object({
    calendarId: z.string().uuid(),
    contactId: z.string().uuid(),
    serviceId: z.string().optional(),
    services: z.array(appointmentServiceLineSchema).optional(),
    workItemId: z.string().optional(),
    assignedToId: z.string().optional(),
    title: z.string().min(1).max(255),
    description: z.string().max(5000).optional(),
    startAt: z.string().min(1),
    endAt: z.string().min(1),
    status: z.enum([
      "PENDING_COMPLETION",
      "UNCONFIRMED",
      "CONFIRMED",
      "WAITING",
      "IN_SERVICE",
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
    clientPackageId: z.string().uuid().optional().or(z.literal("")),
  })
  .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    message: "End must be after start",
    path: ["endAt"],
  });

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

export const appointmentFormDefaults: AppointmentFormValues = {
  calendarId: "",
  contactId: "",
  serviceId: "",
  services: [],
  workItemId: "",
  assignedToId: "",
  title: "",
  description: "",
  startAt: "",
  endAt: "",
  status: "CONFIRMED",
  locationType: "PHYSICAL",
  locationValue: "",
  notes: "",
  clientPackageId: "",
};

export function appointmentToForm(
  a: Appointment,
  timezone?: string,
): AppointmentFormValues {
  const tzInput = (iso: string) =>
    timezone ? utcToLocalDateTimeInputValue(iso, timezone) : toLocalDatetimeInput(iso);
  return {
    calendarId: a.calendarId ?? "",
    contactId: a.contactId ?? "",
    serviceId: a.serviceId ?? "",
    services:
      a.services?.map((line) => ({
        serviceId: line.serviceId,
        assignedToId: line.assignedToId ?? undefined,
        startAt: line.startAt ?? undefined,
        durationMinutes: line.durationMinutes ?? undefined,
      })) ?? [],
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
    clientPackageId: "",
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
    services: values.services?.length ? values.services : undefined,
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
    clientPackageId: values.clientPackageId?.trim() || undefined,
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
  if (status === "PENDING_COMPLETION") return "Pending completion";
  return (
    APPOINTMENT_STATUS_OPTIONS.find((o) => o.value === status)?.label ??
    (status === "CANCELLED"
      ? "Cancelled"
      : status === "NO_SHOW"
        ? "No show"
        : status)
  );
}

export function getAppointmentStatusDisplayLabel(
  status: AppointmentStatus,
  relatedCheckoutId: string | null,
  relatedCheckoutStatus: string | null,
): string {
  if (
    status === "IN_SERVICE" &&
    relatedCheckoutId &&
    relatedCheckoutStatus !== "PAID"
  ) {
    return "Checking out";
  }

  return formatAppointmentStatus(status);
}

export function isCheckoutOpen(relatedCheckoutStatus: string | null): boolean {
  return Boolean(
    relatedCheckoutStatus &&
      relatedCheckoutStatus !== "PAID" &&
      relatedCheckoutStatus !== "VOID",
  );
}

/** Closed appointment with a paid sale — editing schedule won't change the sale. */
export function requiresClosedSaleEditAcknowledgement(
  appointment: Pick<
    Appointment,
    "status" | "relatedCheckoutId" | "relatedCheckoutStatus"
  >,
): boolean {
  return (
    appointment.status === "COMPLETED" &&
    Boolean(appointment.relatedCheckoutId) &&
    appointment.relatedCheckoutStatus === "PAID"
  );
}

export const CLOSED_SALE_EDIT_GUARD_COPY = {
  title: "Sale closed",
  acknowledgementLabel:
    "I understand that this will not modify the existing sale",
  descriptionParagraphs: [
    "Changes made to this appointment will not be reflected in the existing sale, which has already been closed.",
    "If you need to make changes to the sale, please reopen it instead.",
  ],
} as const;

export function getContactDisplayName(
  contact: Appointment["contact"],
  guest?: {
    guestFirstName?: string | null;
    guestEmail?: string | null;
  } | null,
): string {
  if (!contact) {
    if (guest?.guestFirstName?.trim()) {
      return guest.guestFirstName.trim();
    }
    if (guest?.guestEmail?.trim()) {
      return guest.guestEmail.trim();
    }
    return "Time block";
  }
  return (
    contact.displayName ??
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") ??
    contact.email ??
    "Contact"
  );
}

/** First service name; appends "+ N more" when multiple service lines exist. */
export function getAppointmentServiceSummaryLabel(
  appointment: Pick<Appointment, "service" | "services">,
): string | null {
  const lines = [...(appointment.services ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
  if (lines.length > 1) {
    return `${lines[0]!.service.name} +${lines.length - 1} more`;
  }
  if (lines.length === 1) {
    return lines[0]!.service.name;
  }
  return appointment.service?.name ?? null;
}

export function getMemberDisplayName(member: AppointmentUserSummary): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ");
  return name || member.email;
}

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
