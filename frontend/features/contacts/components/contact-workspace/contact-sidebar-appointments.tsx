"use client";

import Link from "next/link";
import { DateTime } from "luxon";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAppointmentServiceSummaryLabel,
  getMemberDisplayName,
  type Appointment,
} from "@/features/appointments/schemas/appointment-profile";
import { CONTACT_FIELD_LABEL_CLASS } from "@/features/contacts/components/contact-workspace/contact-sidebar-details-fields";
import { INBOX_DETAILS_EMPTY_STATE_CLASS } from "@/features/conversations/styles/inbox-tokens";
import { useContactAppointmentHighlights } from "@/features/contacts/hooks/use-contact-appointment-highlights";
import { useCurrentBusiness } from "@/features/settings/hooks/use-current-business";
import { resolveAppointmentDisplayTimezone } from "@/features/calendars/utils/timezone";
import { cn } from "@/lib/utils";

function formatAppointmentWhen(startAt: string, timezone: string): string {
  const dt = DateTime.fromISO(startAt, { zone: "utc" }).setZone(timezone);
  const date = dt.toFormat("MMMM d");
  const time = dt.toFormat("h:mm a").toLowerCase();
  return `on ${date} at ${time}`;
}

function appointmentTitle(appointment: Appointment): string {
  const serviceLabel = getAppointmentServiceSummaryLabel(appointment);
  if (serviceLabel) return serviceLabel;
  const title = appointment.title.trim();
  return title || "Appointment";
}

function AppointmentHighlightCard({
  appointment,
  timezone,
}: {
  appointment: Appointment;
  timezone: string;
}) {
  const staff = appointment.assignedTo
    ? getMemberDisplayName(appointment.assignedTo)
    : null;

  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
      <p className="text-sm font-semibold leading-snug text-foreground">
        {appointmentTitle(appointment)}
      </p>
      {staff ? (
        <p className="mt-0.5 text-sm text-muted-foreground">with {staff}</p>
      ) : null}
      <p className="mt-0.5 text-sm text-muted-foreground">
        {formatAppointmentWhen(appointment.startAt, timezone)}
      </p>
      <Link
        href={`/business/appointments?appointmentId=${appointment.id}`}
        className="mt-2 inline-block text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline"
      >
        Go to calendar
      </Link>
    </div>
  );
}

function AppointmentEmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-4 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function AppointmentSection({
  label,
  appointment,
  emptyMessage,
  timezone,
}: {
  label: string;
  appointment: Appointment | null;
  emptyMessage: string;
  timezone: string;
}) {
  return (
    <div className="space-y-2">
      <span className={cn("block", CONTACT_FIELD_LABEL_CLASS)}>{label}</span>
      {appointment ? (
        <AppointmentHighlightCard
          appointment={appointment}
          timezone={timezone}
        />
      ) : (
        <AppointmentEmptyCard message={emptyMessage} />
      )}
    </div>
  );
}

function AppointmentTicketCard({
  kind,
  appointment,
  timezone,
}: {
  kind: "next" | "last";
  appointment: Appointment | null;
  timezone: string;
}) {
  const isNext = kind === "next";
  const title = appointment
    ? appointmentTitle(appointment)
    : isNext
      ? "No upcoming appointment"
      : "No past appointment";
  const staff = appointment?.assignedTo
    ? getMemberDisplayName(appointment.assignedTo)
    : "";
  const when = appointment
    ? DateTime.fromISO(appointment.startAt, { zone: "utc" })
        .setZone(timezone)
        .toFormat(isNext ? "cccc, h:mm a" : "MMM d, yyyy")
    : "";

  const inner = (
    <div
      className={cn(
        "flex flex-col rounded-[var(--radius-md)] border border-border bg-white p-4",
        !appointment && "opacity-70",
      )}
    >
      <p
        className={cn(
          "text-xs font-bold uppercase tracking-wide",
          isNext ? "text-violet-primary-normal" : "text-muted-foreground",
        )}
      >
        {isNext ? "Next appointment" : "Last appointment"}
      </p>
      <p
        className={cn(
          "mt-2 pb-2",
          appointment
            ? isNext
              ? "text-base font-bold leading-snug text-foreground"
              : "text-base font-medium leading-snug text-muted-foreground"
            : INBOX_DETAILS_EMPTY_STATE_CLASS,
        )}
      >
        {title}
      </p>
      <div className="flex justify-between gap-3 border-t border-dashed border-border pt-2">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {isNext ? "Date & time" : "Date"}
          </p>
          <p className="mt-0.5 truncate text-sm text-foreground">{when}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Stylist
          </p>
          <p className="mt-0.5 truncate text-sm text-foreground">{staff}</p>
        </div>
      </div>
    </div>
  );

  if (!appointment) return inner;

  return (
    <Link
      href={`/business/appointments?appointmentId=${appointment.id}`}
      className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {inner}
    </Link>
  );
}

export function ContactSidebarAppointments({
  contactId,
  className,
  variant = "default",
}: {
  contactId: string;
  className?: string;
  variant?: "default" | "ticket";
}) {
  const { data: business } = useCurrentBusiness();
  const timezone = resolveAppointmentDisplayTimezone(business?.timezone);
  const { nextAppointment, lastAppointment, isLoading, isError } =
    useContactAppointmentHighlights(contactId);

  if (isLoading) {
    if (variant === "ticket") {
      return (
        <div className={cn("flex flex-col gap-2.5", className)}>
          <Skeleton className="h-40 w-full rounded-[var(--radius-md)]" />
          <Skeleton className="h-40 w-full rounded-[var(--radius-md)]" />
        </div>
      );
    }
    return (
      <div className={cn("space-y-4", className)}>
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-[88px] w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-[88px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn(className)}>
        <AppointmentEmptyCard message="Couldn't load appointments" />
      </div>
    );
  }

  if (variant === "ticket") {
    return (
      <div className={cn("flex flex-col gap-2.5", className)}>
        <AppointmentTicketCard
          kind="next"
          appointment={nextAppointment}
          timezone={timezone}
        />
        <AppointmentTicketCard
          kind="last"
          appointment={lastAppointment}
          timezone={timezone}
        />
      </div>
    );
  }

  const hasAny = Boolean(nextAppointment || lastAppointment);

  if (!hasAny) {
    return (
      <div className={cn("space-y-2", className)}>
        <span className={cn("block", CONTACT_FIELD_LABEL_CLASS)}>
          Appointments
        </span>
        <AppointmentEmptyCard message="No appointments yet" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <AppointmentSection
        label="Next appointment"
        appointment={nextAppointment}
        emptyMessage="No upcoming appointments"
        timezone={timezone}
      />
      <AppointmentSection
        label="Last appointment"
        appointment={lastAppointment}
        emptyMessage="No past appointments"
        timezone={timezone}
      />
    </div>
  );
}
