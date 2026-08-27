"use client";

import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreatePlatformUserDialog } from "@/features/platform/components/create-platform-user-dialog";
import { type DataTableColumn } from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { EntityListLayout } from "@/components/layout/entity-list-layout";
import { ListFilterCheckboxGroup } from "@/components/layout/list-filter-checkbox-group";
import { ListPageSkeleton } from "@/components/layout/list-page";
import { Badge } from "@/components/ui/badge";
import { ListPagination } from "@/components/ui/list-pagination";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import {
  deletePlatformUser,
  listPlatformUsers,
  updatePlatformUser,
} from "@/features/platform/api/platform.api";
import { queryKeys } from "@/lib/query/keys";
import {
  platformRoleFilterOptions,
  platformRoleOptions,
} from "@/features/platform/utils/select-options";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import type { PlatformMemberRole, PlatformUser } from "@/features/platform/types";

const LIST_SCHEMA = {
  page: { default: "1" },
  role: { default: "all" },
} as const;

const PAGE_LIMIT = 20;

function PlatformUsersPageContent() {
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const [deleteTarget, setDeleteTarget] = useState<PlatformUser | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftRole, setDraftRole] = useState(params.role);

  const role = params.role;
  const canManage = useCan(PERMISSIONS["platform.users.manage"]);
  const canRemoveUsers = useCan(PERMISSIONS["platform.users.remove"]);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.platform.users.list({
      page,
      limit: PAGE_LIMIT,
      role: role !== "all" ? role : undefined,
    }),
    queryFn: () =>
      listPlatformUsers({
        page,
        limit: PAGE_LIMIT,
        role: role !== "all" ? role : undefined,
      }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role: newRole,
}: { id: string; role: PlatformMemberRole }) =>
      updatePlatformUser(id, { role: newRole }),
    onSuccess: () => {
      toast.success("Role updated");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.users.all(),
      });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlatformUser(id),
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
      <EntityListLayout
        title="Platform Users"
        description="PandaCue staff and platform users."
        extraActions={canManage ? <CreatePlatformUserDialog /> : null}
        filterAriaLabel="User filters"
        filterActive={role !== "all"}
        filterOpen={filterOpen}
        onFilterOpenChange={(open) => {
          if (open) setDraftRole(role);
          setFilterOpen(open);
        }}
        filterContent={
          <ListFilterCheckboxGroup
            legend="Role"
            options={platformRoleFilterOptions}
            value={draftRole}
            onChange={(next) => setDraftRole(String(next))}
          />
        }
        onFilterApply={() =>
          setParams({ role: draftRole, page: "1" }, { resetPage: true })
        }
        footer={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="users"
            />
          ) : undefined
        }
        columns={columns}
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No platform users found"
        rowActions={
          canManage
            ? (user) => {
                  if (user.role === "SUPER_ADMIN" || !canRemoveUsers) return null;
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

export function PlatformUsersPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <PlatformUsersPageContent />
    </Suspense>
  );
}
