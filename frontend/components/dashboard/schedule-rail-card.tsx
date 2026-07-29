import Link from "next/link";
import { Plus } from "lucide-react";
import { DashboardCardShell } from "@/components/dashboard/dashboard-card-shell";
import type { DashboardFeedAppointment } from "@/features/dashboard/types";

function contactName(appointment: DashboardFeedAppointment): string {
  const contact = appointment.contact;
  if (!contact) {
    return appointment.title?.trim() || "Blocked time";
  }
  return (
    contact.displayName?.trim() ||
    [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() ||
    "Client"
  );
}

function appointmentTone(serviceName?: string | null): string {
  const label = serviceName?.toLowerCase() ?? "";
  if (label.includes("facial")) return "bg-emerald-500";
  if (label.includes("inject")) return "bg-amber-500";
  if (label.includes("massage")) return "bg-cyan-500";
  return "bg-primary";
}

function formatTimeRange(
  startAt: string,
  endAt: string,
  timezone?: string,
): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
  return `${formatter.format(new Date(startAt))} - ${formatter.format(new Date(endAt))}`;
}

interface ScheduleRailCardProps {
  title: string;
  appointments: DashboardFeedAppointment[];
  timezone?: string;
}

export function ScheduleRailCard({
  title,
  appointments,
  timezone,
}: ScheduleRailCardProps) {
  return (
    <DashboardCardShell
      title={title}
      action={
        <Link
          href="/business/appointments?action=create"
          className="flex size-[22px] items-center justify-center rounded-full bg-primary text-white shadow-[0_10px_20px_-14px_rgba(55,91,210,0.9)]"
          aria-label="Create appointment"
        >
          <Plus className="size-3" />
        </Link>
      }
      contentClassName="px-4 pb-4 pt-3"
    >
      {appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No appointments are scheduled for today.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold text-primary/70">TODAY</p>
          {appointments.slice(0, 4).map((appointment) => (
            <div key={appointment.id} className="flex gap-3">
              <span
                className={`mt-1 h-auto min-h-12 w-1.5 shrink-0 rounded-full ${appointmentTone(
                  appointment.serviceName,
                )}`}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-[#12172b] dark:text-foreground">
                  {contactName(appointment)} — {appointment.serviceName ?? "Treatment"}
                </p>
                <p className="mt-1 text-[10.5px] text-[#98a1b5] dark:text-muted-foreground">
                  {formatTimeRange(appointment.startAt, appointment.endAt, timezone)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCardShell>
  );
}
