"use client";

import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { StatusBadge } from "@/components/data-display/status-badge";
import { SearchInput } from "@/components/forms/search-input";
import { EntityWorkspaceLayout } from "@/components/layout/entity-workspace-layout";
import { ListPageSkeleton } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ListPagination } from "@/components/ui/list-pagination";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import {
  WORKSPACE_TABLE_CLASS,
} from "@/lib/design/workspace-tokens";
import { useAuth } from "@/lib/auth/provider";
import { invalidateBusinessMembers } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { AddStaffMemberDialog } from "@/features/settings/components/add-staff-member-dialog";
import { MemberTimeClockPinDialog } from "@/features/settings/components/member-time-clock-pin-dialog";
import type { BusinessMember } from "@/features/settings/types";
import {
  archiveStaffMember,
  listBusinessMembers,
} from "@/features/settings/api/business.api";

const LIST_SCHEMA = {
  page: { default: "1" },
  search: { default: "" },
} as const;

const PAGE_LIMIT = 20;

function memberName(row: BusinessMember) {
  const name = [row.user.firstName, row.user.lastName]
    .filter(Boolean)
    .join(" ");
  return name || row.user.email;
}

function BusinessTeamSettingsContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [pinMember, setPinMember] = useState<BusinessMember | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<BusinessMember | null>(
    null,
  );
  const canManage = useCan(PERMISSIONS["members.invite"]);
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.business.members(listFilters),
    queryFn: () =>
      listBusinessMembers({
        page,
        limit: PAGE_LIMIT,
        search: debouncedSearch || undefined,
      }),
  });

  const archiveMutation = useMutation({
    mutationFn: (member: BusinessMember) =>
      archiveStaffMember(member.userId),
    onSuccess: () => {
      toast.success("Staff member archived");
      void invalidateBusinessMembers(queryClient);
      setArchiveTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns = useMemo<DataTableColumn<BusinessMember>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        sortValue: (row) => memberName(row),
        cell: (row) => memberName(row),
      },
      {
        id: "email",
        header: "Email",
        sortable: true,
        sortValue: (row) => row.user.email,
        cell: (row) => row.user.email,
      },
      {
        id: "phone",
        header: "Phone",
        sortable: true,
        sortValue: (row) => row.phoneNumber ?? "",
        cell: (row) => row.phoneNumber || "—",
      },
      {
        id: "role",
        header: "User type",
        sortable: true,
        sortValue: (row) => row.role,
        cell: (row) => (row.role === "ADMIN" ? "Admin" : "Normal"),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => (
          <StatusBadge status={row.status} domain="membership" />
        ),
      },
      {
        id: "timeclockPin",
        header: "Time Clock PIN",
        cell: (row) => (
          <Button
            variant="link"
            className="h-auto px-0"
            onClick={() => setPinMember(row)}
          >
            {row.hasTimeclockPin ? "••••" : "Set PIN"}
          </Button>
        ),
      },
    ],
    [],
  );

  return (
  <>
      <EntityWorkspaceLayout
        title="Team"
        description="Staff who work at your business."
        search={
          <SearchInput
            value={params.search}
            onChange={(value) =>
              setParams({ search: value, page: "1" }, { resetPage: true })
            }
            placeholder="Search staff…"
            className="min-w-0 flex-1 sm:max-w-md"
          />
        }
        actions={
          canManage ? (
            <Button type="button" size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              Add staff member
            </Button>
          ) : undefined
        }
        footer={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="staff"
            />
          ) : undefined
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          density="compact"
          rowActions={
            canManage
              ? (row) => {
                  const isSelf = row.userId === user?.id;
                  const canArchive =
                    !isSelf &&
                    row.status !== "REMOVED" &&
                    row.role !== "OWNER";
                  if (!canArchive) return null;
                  return (
                    <DataTableRowActions
                      menuLabel="Staff actions"
                      actions={[
                        {
                          label: "Archive",
                          destructive: true,
                          onClick: () => setArchiveTarget(row),
                        },
                      ]}
                    />
                  );
                }
              : undefined
          }
          emptyTitle="No staff yet"
          emptyDescription={
            canManage ? "Add your first staff member to get started." : undefined
          }
          emptyAction={
            canManage ? (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus className="mr-1.5 size-4" />
                Add staff member
              </Button>
            ) : undefined
          }
          className={WORKSPACE_TABLE_CLASS}
        />
      </EntityWorkspaceLayout>

      <AddStaffMemberDialog open={open} onOpenChange={setOpen} />

      <MemberTimeClockPinDialog
        member={pinMember}
        open={Boolean(pinMember)}
        onOpenChange={(next) => {
          if (!next) setPinMember(null);
        }}
      />

      <AlertDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(next) => {
          if (!next) setArchiveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget
                ? `${memberName(archiveTarget)} will be removed from your active staff list. You can add them again later with the same email.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={archiveMutation.isPending}
              onClick={() =>
                archiveTarget && archiveMutation.mutate(archiveTarget)
              }
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function BusinessTeamSettings() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <BusinessTeamSettingsContent />
    </Suspense>
  );
}
