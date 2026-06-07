"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { CalendarCreationFlow } from "@/features/calendars/components/calendar-creation-flow";
import { CalendarDetailsDialog } from "@/features/calendars/components/calendar-details-dialog";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { ActionButton } from "@/components/ui/action-button";
import {
  formatDurationLabel,
  getBookingTypeLabel,
  slugifyCalendarName,
  type Calendar,
  type CalendarStatus,
} from "@/features/calendars/schemas/calendar-profile";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { queryKeys } from "@/lib/query/keys";
import { getCurrentBusiness } from "@/features/settings/api/business.api";
import {
  calendarStatusLabel,
  deleteCalendar,
  formatCalendarTableDate,
  listCalendars,
  setCalendarPublicBooking,
} from "@/features/calendars/api/calendars.api";
import {
  canUsePublicBooking,
  copyBookingLink,
  copyEmbedCode,
  getCalendarPublicBookingLabel,
  openBookingPage,
} from "@/features/calendars/utils/calendar-booking-utils";

function calendarStatusVariant(
  status: CalendarStatus,
): "default" | "secondary" {
  return status === "ACTIVE" ? "default" : "secondary";
}

function calendarPublicBookingVariant(
  calendar: Calendar,
): "default" | "secondary" {
  return canUsePublicBooking(calendar) ? "default" : "secondary";
}

export function BusinessCalendarsSettings() {
  const router = useRouter();
  const canManage = useCan(PERMISSIONS["settings.business"]);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const { data: business } = useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: () => getCurrentBusiness(),
  });

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.calendars.list({ page: 1, limit: 100 }),
    queryFn: () => listCalendars({ page: 1, limit: 100 }),
  });

  const togglePublicMutation = useMutation({
    mutationFn: async ({
      calendar,
      enable,
    }: {
      calendar: Calendar;
      enable: boolean;
    }) => {
      if (!enable) {
        return setCalendarPublicBooking(calendar.id, false);
      }
      const slug = slugifyCalendarName(calendar.name);
      return setCalendarPublicBooking(calendar.id, true, {
        publicSlug: slug,
        status: "ACTIVE",
        widgetSettings: {
          ...(calendar.widgetSettings as object),
          bookingSlug: slug,
        },
      });
    },
    onSuccess: async (_, { enable }) => {
      toast.success(
        enable ? "Public booking enabled" : "Public booking disabled",
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.calendars.all() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCalendar(id),
    onSuccess: async () => {
      toast.success("Calendar deleted");
      setDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.calendars.all() });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const detailsCalendar = useMemo(
    () => data?.items.find((c) => c.id === detailsId) ?? null,
    [data?.items, detailsId],
  );

  const columns = useMemo<DataTableColumn<Calendar>[]>(
    () => [
      {
        id: "name",
        header: "Calendar",
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <div className="min-w-[180px]">
            <div className="flex items-center gap-2">
              {row.color ? (
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                  aria-hidden
                />
              ) : null}
              <Link
                href={`/business/settings/calendars/${row.id}/edit`}
                className="font-medium hover:underline"
              >
                {row.name}
              </Link>
            </div>
            {row.description ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {row.description}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "type",
        header: "Booking type",
        sortable: true,
        sortValue: (row) => getBookingTypeLabel(row.type),
        cell: (row) => (
          <span className="text-sm">{getBookingTypeLabel(row.type)}</span>
        ),
      },
      {
        id: "duration",
        header: "Duration",
        sortable: true,
        sortValue: (row) => row.defaultDurationMinutes,
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {formatDurationLabel(row.defaultDurationMinutes)}
          </span>
        ),
      },
      {
        id: "public",
        header: "Public link",
        sortable: true,
        sortValue: (row) => getCalendarPublicBookingLabel(row),
        cell: (row) => (
          <Badge variant={calendarPublicBookingVariant(row)}>
            {getCalendarPublicBookingLabel(row)}
          </Badge>
        ),
      },
      {
        id: "bookings",
        header: "Bookings",
        sortable: true,
        sortValue: (row) => row.appointmentCount ?? 0,
        className: "text-right tabular-nums",
        cell: (row) => (
          <span className="tabular-nums text-sm">
            {row.appointmentCount ?? 0}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => (
          <Badge variant={calendarStatusVariant(row.status)}>
            {calendarStatusLabel(row.status)}
          </Badge>
        ),
      },
      {
        id: "updated",
        header: "Updated",
        sortable: true,
        sortValue: (row) => row.updatedAt,
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {formatCalendarTableDate(row.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  const buildRowActions = (row: Calendar) => {
    const isPublic = canUsePublicBooking(row);
    const readOnlyActions = isPublic
      ? [
          {
            label: "Copy booking link",
            onClick: () => void copyBookingLink(row),
          },
          {
            label: "Open booking page",
            onClick: () => openBookingPage(row),
          },
        ]
      : [];

    if (!canManage) {
      if (readOnlyActions.length === 0) return null;
      return (
        <DataTableRowActions
          menuLabel={`Actions for ${row.name}`}
          actions={readOnlyActions}
        />
      );
    }

    return (
      <DataTableRowActions
        menuLabel={`Actions for ${row.name}`}
        actions={[
          {
            label: "Edit",
            onClick: () =>
              router.push(`/business/settings/calendars/${row.id}/edit`),
          },
          {
            label: "View details",
            onClick: () => setDetailsId(row.id),
          },
          ...readOnlyActions,
          {
            label: "Copy embed code",
            onClick: () => void copyEmbedCode(row),
            disabled: !isPublic || !row.embedEnabled,
          },
          isPublic
            ? {
                label: "Disable public booking",
                onClick: () =>
                  togglePublicMutation.mutate({ calendar: row, enable: false }),
              }
            : {
                label: "Enable public booking",
                onClick: () =>
                  togglePublicMutation.mutate({ calendar: row, enable: true }),
              },
          {
            label: "Delete",
            onClick: () => setDeleteId(row.id),
            destructive: true,
          },
        ]}
      />
    );
  };

  return (
    <div className="space-y-[var(--page-stack-gap)]">
      <PageHeader
        description="Create calendars, set when you're available, and share a booking link with customers."
        actions={
          canManage ? (
            <ActionButton onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              New calendar
            </ActionButton>
          ) : undefined
        }
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No calendars yet"
        emptyDescription="Create a calendar to set your availability and share a booking link with customers."
        emptyAction={
          canManage ? (
            <ActionButton onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              New calendar
            </ActionButton>
          ) : undefined
        }
        rowActions={buildRowActions}
      />

      <CalendarCreationFlow
        open={createOpen}
        onOpenChange={setCreateOpen}
        businessTimezone={business?.timezone}
        canManage={canManage}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.calendars.all() });
        }}
      />

      <CalendarDetailsDialog
        calendarId={detailsId}
        open={!!detailsId}
        onOpenChange={(open) => !open && setDetailsId(null)}
        onEdit={(id) => router.push(`/business/settings/calendars/${id}/edit`)}
        canManage={canManage}
        listSnapshot={detailsCalendar}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete calendar"
        description="This calendar will be removed. Existing appointments are kept."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
