import { DashboardCardShell } from "@/components/dashboard/dashboard-card-shell";
import { StatusPill } from "@/components/data-display/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardFeedAppointment } from "@/features/dashboard/types";

function contactName(appointment: DashboardFeedAppointment): string {
  return (
    appointment.contact.displayName ??
    [appointment.contact.firstName, appointment.contact.lastName]
      .filter(Boolean)
      .join(" ") ??
    "Client"
  );
}

function staffInitials(appointment: DashboardFeedAppointment): string {
  const label =
    appointment.assignedTo?.displayName ??
    [appointment.assignedTo?.firstName, appointment.assignedTo?.lastName]
      .filter(Boolean)
      .join(" ");
  return (
    label
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "FD"
  );
}

function serviceVariant(serviceName?: string | null) {
  const label = serviceName?.toLowerCase() ?? "";
  if (label.includes("facial")) return "success";
  if (label.includes("inject")) return "warning";
  if (label.includes("massage")) return "info";
  return "neutral";
}

function formatSlot(startAt: string, timezone?: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(startAt));
}

interface AppointmentConfirmationsCardProps {
  title: string;
  description?: string;
  appointments: DashboardFeedAppointment[];
  timezone?: string;
}

export function AppointmentConfirmationsCard({
  title,
  description,
  appointments,
  timezone,
}: AppointmentConfirmationsCardProps) {
  return (
    <DashboardCardShell
      title={title}
      description={description}
      actionLabel="Full list"
      actionHref="/business/appointments"
      contentClassName="px-4 pb-2 pt-2"
    >
      {appointments.length === 0 ? (
        <p className="px-3 py-8 text-sm text-muted-foreground">
          No appointments are waiting for confirmation.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Staff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="font-medium">{contactName(appointment)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatSlot(appointment.startAt, timezone)}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      label={appointment.serviceName ?? "Consultation"}
                      variant={serviceVariant(appointment.serviceName)}
                    />
                  </TableCell>
                  <TableCell className="max-w-40 truncate text-muted-foreground">
                    {appointment.notes?.trim() || "Needs confirmation"}
                  </TableCell>
                  <TableCell>
                    <div className="ml-auto flex size-5 items-center justify-center rounded-full bg-white/75 text-[8px] font-semibold text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:bg-white/10">
                      {staffInitials(appointment)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </DashboardCardShell>
  );
}
