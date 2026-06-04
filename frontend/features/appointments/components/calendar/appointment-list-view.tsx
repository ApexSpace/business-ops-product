"use client";

import { useMemo } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { Badge } from "@/components/ui/badge";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  formatAppointmentRange,
  formatAppointmentStatus,
  getContactDisplayName,
  type Appointment,
  type AppointmentStatus,
} from "@/features/appointments/schemas/appointment-profile";
import type { Calendar } from "@/features/calendars/schemas/calendar-profile";
import { resolveTimezoneForAppointment } from "@/features/calendars/utils/timezone";
import type { PaginatedMeta } from "@/features/appointments/types";

const STATUS_VARIANT: Record<
  AppointmentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SCHEDULED: "outline",
  CONFIRMED: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

interface AppointmentListViewProps {
  appointments: Appointment[];
  timezone: string;
  calendars?: Calendar[];
  businessTimezone?: string | null;
  isLoading?: boolean;
  page: number;
  meta?: PaginatedMeta;
  onPageChange: (page: number) => void;
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: string) => void;
}

export function AppointmentListView({
  appointments,
  timezone,
  calendars,
  businessTimezone,
  isLoading,
  page,
  meta,
  onPageChange,
  onEdit,
  onDelete,
}: AppointmentListViewProps) {
  const columns = useMemo<DataTableColumn<Appointment>[]>(
    () => [
      {
        id: "when",
        header: "When",
        cell: (row) =>
          formatAppointmentRange(
            row.startAt,
            row.endAt,
            resolveTimezoneForAppointment(
              row.calendarId,
              calendars,
              businessTimezone,
            ),
          ),
      },
      {
        id: "title",
        header: "Title",
        cell: (row) => (
          <div>
            <p className="font-medium">{row.title}</p>
            <p className="text-xs text-muted-foreground">{row.calendar.name}</p>
          </div>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        cell: (row) => getContactDisplayName(row.contact),
      },
      {
        id: "staff",
        header: "Staff",
        cell: (row) =>
          row.assignedTo
            ? [row.assignedTo.firstName, row.assignedTo.lastName]
                .filter(Boolean)
                .join(" ") || row.assignedTo.email
            : "—",
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <Badge variant={STATUS_VARIANT[row.status]}>
            {formatAppointmentStatus(row.status)}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (row) => (
          <DataTableRowActions
            actions={[
              { label: "Edit", onClick: () => onEdit(row) },
              {
                label: "Delete",
                onClick: () => onDelete(row.id),
                destructive: true,
              },
            ]}
          />
        ),
      },
    ],
    [calendars, businessTimezone, onEdit, onDelete],
  );

  if (isLoading && appointments.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        Loading appointments…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={appointments}
        getRowId={(row) => row.id}
      />
      {appointments.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          No appointments match your filters.
        </p>
      ) : null}
      {meta ? (
        <ListPagination
          meta={meta}
          page={page}
          onPageChange={onPageChange}
          label="appointments"
        />
      ) : null}
    </div>
  );
}
