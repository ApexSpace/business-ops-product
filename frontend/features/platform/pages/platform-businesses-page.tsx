"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreateBusinessDialog } from "@/features/platform/components/create-business-dialog";
import { EditBusinessDialog } from "@/features/platform/components/edit-business-dialog";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import {
  DataTableRowActions,
  type RowAction,
} from "@/components/data-display/data-table-row-actions";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { SearchInput } from "@/components/forms/search-input";
import { FilterBar } from "@/components/layout/filter-bar";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ui/list-pagination";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import {
  deletePlatformBusiness,
  listPlatformBusinesses,
} from "@/features/platform/api/platform.api";
import { invalidatePlatformBusinesses } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { businessStatusFilterOptions } from "@/features/platform/utils/select-options";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import type { Business } from "@/features/platform/types";

const LIST_SCHEMA = {
  page: { default: "1" },
  status: { default: "all" },
  search: { default: "" },
} as const;

const PAGE_LIMIT = 20;

function PlatformBusinessesPageContent() {
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [editing, setEditing] = useState<Business | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null);

  const status = params.status;

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    status: status !== "all" ? status : undefined,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.platform.businesses.list(listFilters),
    queryFn: () => listPlatformBusinesses(listFilters),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlatformBusiness(id),
    onSuccess: () => {
      toast.success("Business deleted");
      void invalidatePlatformBusinesses(queryClient);
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canCreate = useCan(PERMISSIONS["platform.businesses.create"]);
  const canUpdate = useCan(PERMISSIONS["platform.businesses.update"]);
  const canDelete = useCan(PERMISSIONS["platform.businesses.delete"]);
  const showActions = canUpdate || canDelete;

  const columns = useMemo<DataTableColumn<Business>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <Link
            href={`/platform/businesses/${row.id}`}
            className="font-medium hover:underline"
          >
            {row.name}
          </Link>
        ),
      },
      {
        id: "slug",
        header: "Slug",
        sortable: true,
        sortValue: (row) => row.slug,
        cell: (row) => (
          <span className="text-muted-foreground">{row.slug}</span>
        ),
      },
      {
        id: "industry",
        header: "Industry",
        sortable: true,
        sortValue: (row) => row.industry?.name ?? "",
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.industry?.name ?? "—"}
          </span>
        ),
      },
      {
        id: "snapshot",
        header: "Snapshot",
        sortable: true,
        sortValue: (row) => row.snapshotName ?? "",
        cell: (row) => (
          <span className="text-muted-foreground">
            {row.snapshotName ?? "—"}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => (
          <StatusBadge status={row.status} domain="business" />
        ),
      },
      {
        id: "created",
        header: "Created",
        sortable: true,
        sortValue: (row) => row.createdAt,
        cell: (row) => (
          <span className="text-muted-foreground">
            {new Date(row.createdAt).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <ListPage
        title="Businesses"
        description="Manage all client businesses on the platform."
        actions={canCreate ? <CreateBusinessDialog /> : null}
        filters={
          <FilterBar>
            <SearchInput
              value={params.search}
              onChange={(value) =>
                setParams({ search: value, page: "1" }, { resetPage: true })
              }
              placeholder="Search businesses…"
            />
            <SearchableSelect
              items={businessStatusFilterOptions}
              value={status}
              onValueChange={(v) =>
                setParams({ status: v ?? "all", page: "1" }, { resetPage: true })
              }
              placeholder="Status"
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
              label="businesses"
            />
          ) : null
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No businesses found"
          rowActions={
            showActions
              ? (business) => {
                  const actions: RowAction[] = [];
                  if (canUpdate) {
                    actions.push({
                      label: "Edit",
                      onClick: () => setEditing(business),
                    });
                  }
                  if (canDelete) {
                    actions.push({
                      label: "Delete",
                      onClick: () => setDeleteTarget(business),
                      destructive: true,
                    });
                  }
                  return <DataTableRowActions actions={actions} />;
                }
              : undefined
          }
        />
      </ListPage>

      <EditBusinessDialog
        business={editing}
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete business?"
        description={
          <>
            This will permanently delete <strong>{deleteTarget?.name}</strong>{" "}
            and all related data including members, contacts, leads, pipelines,
            and tags. This action cannot be undone.
          </>
        }
        isPending={deleteMutation.isPending}
        onConfirm={() =>
          deleteTarget && deleteMutation.mutate(deleteTarget.id)
        }
      />
    </>
  );
}

export function PlatformBusinessesPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <PlatformBusinessesPageContent />
    </Suspense>
  );
}
