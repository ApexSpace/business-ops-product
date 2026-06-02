"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { CalendarCreationFlow } from "@/components/calendars/calendar-creation-flow";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import {
  getCreationTypeLabel,
  getGoogleSyncLabel,
  type Calendar,
} from "@/lib/calendar-profile";
import { canManageBusinessSettings } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/lib/auth-provider";
import type { Business, PaginatedResult } from "@/types/api";

export function BusinessCalendarsSettings() {
  const router = useRouter();
  const { jwt, contexts } = useAuth();
  const canManage = canManageBusinessSettings(jwt, contexts);
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: business } = useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: () => apiClient<Business>("businesses/current"),
  });

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.calendars.list({ page: 1, limit: 100 }),
    queryFn: () =>
      apiClient<PaginatedResult<Calendar>>("calendars", {
        searchParams: { page: 1, limit: 100 },
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`calendars/${id}`, {
        method: "DELETE",
        searchParams: { confirm: true },
      }),
    onSuccess: async () => {
      toast.success("Calendar deleted");
      setDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.calendars.all() });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns = useMemo<DataTableColumn<Calendar>[]>(
    () => [
      {
        id: "name",
        header: "Calendar",
        cell: (row) => (
          <div className="flex items-center gap-2">
            {row.color ? (
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: row.color }}
              />
            ) : null}
            <span className="font-medium">{row.name}</span>
          </div>
        ),
      },
      {
        id: "type",
        header: "Type",
        cell: (row) => (
          <span className="text-muted-foreground text-sm">
            {getCreationTypeLabel(row.type)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <Badge variant={row.status === "ACTIVE" ? "default" : "secondary"}>
            {row.status === "ACTIVE" ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      { id: "timezone", header: "Timezone", cell: (row) => row.timezone },
      {
        id: "staff",
        header: "Staff",
        cell: (row) => String(row.staffCount ?? 0),
      },
      {
        id: "google",
        header: "Google sync",
        cell: (row) => (
          <span className="text-muted-foreground text-sm">
            {getGoogleSyncLabel(row)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (row) =>
          canManage ? (
            <DataTableRowActions
              actions={[
                {
                  label: "Edit",
                  onClick: () =>
                    router.push(`/business/settings/calendars/${row.id}/edit`),
                },
                {
                  label: "Delete",
                  onClick: () => setDeleteId(row.id),
                  destructive: true,
                },
              ]}
            />
          ) : null,
      },
    ],
    [canManage, router],
  );

  return (
    <div className="space-y-[var(--page-stack-gap)]">
      <PageHeader
        description="Create booking calendars with availability, staff, and rules. Internal calendars work without Google."
        actions={
          canManage ? (
            <ActionButton onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              New calendar
            </ActionButton>
          ) : undefined
        }
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
        />
      )}

      <CalendarCreationFlow
        open={createOpen}
        onOpenChange={setCreateOpen}
        businessTimezone={business?.timezone}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.calendars.all() });
        }}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete calendar"
        description="This calendar and its configuration will be removed. Existing appointments are kept but the calendar link remains."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
