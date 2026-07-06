"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatTimeInTimezone } from "@/features/calendars/utils/timezone";

export interface PulseTimelineAppointment {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  contact: {
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
}

type PulseStatus = "live" | "done" | "upcoming";

function resolvePulseStatus(appointment: PulseTimelineAppointment): PulseStatus {
  const now = Date.now();
  const start = new Date(appointment.startAt).getTime();
  const end = new Date(appointment.endAt).getTime();

  if (appointment.status === "COMPLETED" || appointment.status === "CANCELLED") {
    return "done";
  }
  if (now >= start && now <= end) {
    return "live";
  }
  if (now > end) {
    return "done";
  }
  return "upcoming";
}

const statusStyles: Record<PulseStatus, string> = {
  live: "bg-success text-success",
  done: "bg-muted-foreground/40 text-muted-foreground",
  upcoming: "bg-primary text-primary",
};

function contactLabel(appointment: PulseTimelineAppointment): string {
  const contact = appointment.contact;
  return (
    contact.displayName ??
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") ??
    "Contact"
  );
}

interface PulseTimelineProps {
  appointments: PulseTimelineAppointment[];
  timezone?: string;
  className?: string;
}

export function PulseTimeline({
  appointments,
  timezone,
  className,
}: PulseTimelineProps) {
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  return (
    <div className={cn("rounded-xl border border-border bg-card", className)}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Today&apos;s pulse</h2>
        <p className="text-xs text-muted-foreground">
          Appointments scheduled for today
        </p>
      </div>
      {sorted.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          No appointments on the calendar today.
        </p>
      ) : (
        <ul className="divide-y divide-border/60">
          {sorted.map((appointment) => {
            const status = resolvePulseStatus(appointment);
            return (
              <li key={appointment.id}>
                <Link
                  href={`/business/appointments?appointmentId=${appointment.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-table-row-hover"
                >
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      statusStyles[status],
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {appointment.title || contactLabel(appointment)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {contactLabel(appointment)}
                    </p>
                  </div>
                  <time
                    className="shrink-0 text-xs tabular-nums text-muted-foreground"
                    dateTime={appointment.startAt}
                  >
                    {formatTimeInTimezone(
                      appointment.startAt,
                      timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
                    )}
                  </time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
