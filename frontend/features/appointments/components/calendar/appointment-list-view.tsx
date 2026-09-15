"use client";

import { useMemo } from "react";
import { type DataTableColumn } from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { LoadingState } from "@/components/data-display/loading-state";
import { Badge } from "@/components/ui/badge";
import { EntityListLayout } from "@/components/layout/entity-list-layout";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  formatAppointmentRange,
  getAppointmentStatusDisplayLabel,
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
  PENDING_COMPLETION: "outline",
  UNCONFIRMED: "outline",
  CONFIRMED: "default",
  WAITING: "default",
  IN_SERVICE: "default",
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
        cell: (row) =>
          getContactDisplayName(row.contact, {
            guestFirstName: row.guestFirstName,
            guestEmail: row.guestEmail,
          }),
      },
      {
        id: "staff",
        header: "Staff",
        cell: (row) =>
          row.assignedTo
            ? [row.assignedTo.firstName, row.assignedTo.lastName]
                .filter(Boolean)
                .join(" ") || row.assignedTo.email
            : "",
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <Badge variant={STATUS_VARIANT[row.status]}>
            {getAppointmentStatusDisplayLabel(
              row.status,
              row.relatedCheckoutId ?? null,
              row.relatedCheckoutStatus ?? null,
            )}
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
      <LoadingState
        label="Loading appointments…"
        className="h-48 rounded-[var(--radius-xl)] border border-dashed py-0"
      />
    );
  }

  return (
    <EntityListLayout
      title="Appointments"
      hideHeader
      flush
      columns={columns}
      data={appointments}
      getRowId={(row) => row.id}
      emptyTitle="No appointments match your filters."
      footer={
        meta ? (
          <ListPagination
            meta={meta}
            page={page}
            onPageChange={onPageChange}
            label="appointments"
          />
        ) : undefined
      }
    />
  );
}
