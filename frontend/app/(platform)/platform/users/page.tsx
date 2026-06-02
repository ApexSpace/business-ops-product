"use client";

import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreatePlatformUserDialog } from "@/components/platform/create-platform-user-dialog";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { FilterBar } from "@/components/layout/filter-bar";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { Badge } from "@/components/ui/badge";
import { ListPagination } from "@/components/ui/list-pagination";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { useListSearchParams } from "@/hooks/use-list-search-params";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { platformRoleFilterOptions, platformRoleOptions } from "@/lib/select-options";
import { useAuth } from "@/lib/auth-provider";
import { canManagePlatformUsers } from "@/lib/permissions";
import type {
  PaginatedResult,
  PlatformMemberRole,
  PlatformUser,
} from "@/types/api";

const LIST_SCHEMA = {
  page: { default: "1" },
  role: { default: "all" },
} as const;

const PAGE_LIMIT = 20;

function PlatformUsersPageContent() {
  const { jwt } = useAuth();
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const [deleteTarget, setDeleteTarget] = useState<PlatformUser | null>(null);

  const role = params.role;
  const canManage = canManagePlatformUsers(jwt?.platformRole);
  const isSuperAdmin = jwt?.platformRole === "SUPER_ADMIN";

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.platform.users.list({
      page,
      limit: PAGE_LIMIT,
      role: role !== "all" ? role : undefined,
    }),
    queryFn: () =>
      apiClient<PaginatedResult<PlatformUser>>("platform/users", {
        searchParams: {
          page,
          limit: PAGE_LIMIT,
          ...(role !== "all" ? { role } : {}),
        },
      }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role: newRole }: { id: string; role: PlatformMemberRole }) =>
      apiClient<PlatformUser>(`platform/users/${id}`, {
        method: "PATCH",
        body: { role: newRole },
      }),
    onSuccess: () => {
      toast.success("Role updated");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.users.all(),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`platform/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Platform user removed");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.users.all(),
      });
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns = useMemo<DataTableColumn<PlatformUser>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        sortValue: (row) =>
          [row.firstName, row.lastName].filter(Boolean).join(" "),
        cell: (row) => (
          <span className="font-medium">
            {[row.firstName, row.lastName].filter(Boolean).join(" ") || "—"}
          </span>
        ),
      },
      {
        id: "email",
        header: "Email",
        sortable: true,
        sortValue: (row) => row.email,
        cell: (row) => row.email,
      },
      {
        id: "role",
        header: "Role",
        cell: (row) => {
          const isSuperAdminUser = row.role === "SUPER_ADMIN";
          if (canManage && !isSuperAdminUser) {
            return (
              <SearchableSelect
                items={platformRoleOptions}
                value={row.role}
                onValueChange={(v) =>
                  v &&
                  updateRoleMutation.mutate({
                    id: row.id,
                    role: v as PlatformMemberRole,
                  })
                }
                triggerClassName="w-[160px]"
              />
            );
          }
          return <Badge variant="secondary">{row.role}</Badge>;
        },
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => <StatusBadge status={row.status} domain="user" />,
      },
      {
        id: "added",
        header: "Added",
        sortable: true,
        sortValue: (row) => row.createdAt,
        cell: (row) => (
          <span className="text-muted-foreground">
            {new Date(row.createdAt).toLocaleDateString()}
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- role select uses mutation from closure
    [canManage],
  );

  return (
    <>
      <ListPage
        title="Platform Users"
        description="CodeSol staff and platform users."
        actions={canManage ? <CreatePlatformUserDialog /> : null}
        filters={
          <FilterBar>
            <SearchableSelect
              items={platformRoleFilterOptions}
              value={role}
              onValueChange={(v) =>
                setParams({ role: v ?? "all", page: "1" }, { resetPage: true })
              }
              placeholder="Role"
              triggerClassName="w-[180px]"
            />
          </FilterBar>
        }
        pagination={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="users"
            />
          ) : null
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No platform users found"
          rowActions={
            canManage
              ? (user) => {
                  if (user.role === "SUPER_ADMIN" || !isSuperAdmin) return null;
                  return (
                    <DataTableRowActions
                      actions={[
                        {
                          label: "Remove",
                          onClick: () => setDeleteTarget(user),
                          destructive: true,
                          disabled: deleteMutation.isPending,
                        },
                      ]}
                    />
                  );
                }
              : undefined
          }
        />
      </ListPage>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove platform access?"
        description={
          <>
            This will revoke platform access for{" "}
            <strong>{deleteTarget?.email}</strong>. Their user account will
            remain.
          </>
        }
        confirmLabel="Remove access"
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </>
  );
}

export default function PlatformUsersPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <PlatformUsersPageContent />
    </Suspense>
  );
}
