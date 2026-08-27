"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreateBusinessWizard } from "@/features/platform/components/create-business-wizard";
import { EditBusinessDialog } from "@/features/platform/components/edit-business-dialog";
import { type DataTableColumn } from "@/components/data-display/data-table";
import {
  DataTableRowActions,
  type RowAction,
} from "@/components/data-display/data-table-row-actions";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { EntityListLayout } from "@/components/layout/entity-list-layout";
import { ListFilterCheckboxGroup } from "@/components/layout/list-filter-checkbox-group";
import { ListPageSkeleton } from "@/components/layout/list-page";
import { ListPagination } from "@/components/ui/list-pagination";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import {
  deletePlatformBusiness,
  listPlatformBusinesses,
} from "@/features/platform/api/platform.api";
import { invalidatePlatformBusinesses } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import {
  businessStatusFilterOptions,
  subscriptionStatusFilterOptions,
} from "@/features/platform/utils/select-options";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import type { Business } from "@/features/platform/types";

const LIST_SCHEMA = {
  page: { default: "1" },
  status: { default: "all" },
  subscriptionStatus: { default: "all" },
  search: { default: "" },
} as const;

const PAGE_LIMIT = 20;

function PlatformBusinessesPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [editing, setEditing] = useState<Business | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState(params.status);
  const [draftSubscriptionStatus, setDraftSubscriptionStatus] = useState(
    params.subscriptionStatus,
  );

  const status = params.status;
  const subscriptionStatus = params.subscriptionStatus;

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    status: status !== "all" ? status : undefined,
    subscriptionStatus:
      subscriptionStatus !== "all" ? subscriptionStatus : undefined,
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
        id: "status",
        header: "Business Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => (
          <StatusBadge status={row.status} domain="business" />
        ),
      },
      {
        id: "subscriptionStatus",
        header: "Subscription Status",
        sortable: true,
        sortValue: (row) => row.subscriptionStatus ?? "",
        cell: (row) =>
          row.subscriptionStatus ? (
            <StatusBadge status={row.subscriptionStatus} domain="subscription" />
          ) : (
            <span className="text-muted-foreground">—</span>
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
      {
        id: "updated",
        header: "Updated",
        sortable: true,
        sortValue: (row) => row.updatedAt,
        cell: (row) => (
          <span className="text-muted-foreground">
            {new Date(row.updatedAt).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <EntityListLayout
        title="Businesses"
        description="Manage all client businesses on the platform."
        extraActions={canCreate ? <CreateBusinessWizard /> : null}
        searchPlaceholder="Search businesses…"
        searchValue={params.search}
        onSearchChange={(value) =>
          setParams({ search: value, page: "1" }, { resetPage: true })
        }
        filterAriaLabel="Business filters"
        filterActive={status !== "all" || subscriptionStatus !== "all"}
        filterOpen={filterOpen}
        onFilterOpenChange={(open) => {
          if (open) {
            setDraftStatus(status);
            setDraftSubscriptionStatus(subscriptionStatus);
          }
          setFilterOpen(open);
        }}
        filterContent={
          <>
            <ListFilterCheckboxGroup
              legend="Business status"
              options={businessStatusFilterOptions}
              value={draftStatus}
              onChange={(next) => setDraftStatus(String(next))}
            />
            <ListFilterCheckboxGroup
              legend="Subscription status"
              options={subscriptionStatusFilterOptions}
              value={draftSubscriptionStatus}
              onChange={(next) => setDraftSubscriptionStatus(String(next))}
            />
          </>
        }
        onFilterApply={() =>
          setParams(
            {
              status: draftStatus,
              subscriptionStatus: draftSubscriptionStatus,
              page: "1",
            },
            { resetPage: true },
          )
        }
        footer={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="businesses"
            />
          ) : undefined
        }
        columns={columns}
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No businesses found"
        actionsColumnHeader="Actions"
        rowActions={
          showActions
            ? (business) => {
                  const actions: RowAction[] = [
                    {
                      label: "View",
                      onClick: () =>
                        router.push(`/platform/businesses/${business.id}`),
                    },
                  ];
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
            : (business) => (
                <DataTableRowActions
                  actions={[
                    {
                      label: "View",
                      onClick: () =>
                        router.push(`/platform/businesses/${business.id}`),
                    },
                  ]}
                />
              )
        }
      />

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
