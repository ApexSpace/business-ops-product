"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileEdit, Layers } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreateCapabilityDialog } from "@/features/platform/components/capabilities/create-capability-dialog";
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
import { StatsCard } from "@/components/layout/stats-card";
import { ListPagination } from "@/components/ui/list-pagination";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import {
  deletePlatformCapability,
  movePlatformCapabilityToDraft,
  publishPlatformCapability,
  getPlatformCapabilityStats,
  listPlatformCapabilities,
} from "@/features/platform/api/capabilities.api";
import { queryKeys } from "@/lib/query/keys";
import { capabilityStatusFilterOptions } from "@/features/platform/utils/select-options";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import type { CapabilityListItem } from "@/features/platform/types/capability";

const LIST_SCHEMA = {
  page: { default: "1" },
  status: { default: "all" },
  search: { default: "" },
} as const;

const PAGE_LIMIT = 20;

function formatUpdatedAt(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PlatformCapabilitiesPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [deleteTarget, setDeleteTarget] = useState<CapabilityListItem | null>(
    null,
  );
  const canManage = useCan(PERMISSIONS["platform.capabilities.manage"]);
  const status = params.status;

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    status: status !== "all" ? status : undefined,
    search: debouncedSearch || undefined,
  };

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.platform.capabilities.stats(),
    queryFn: () => getPlatformCapabilityStats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.platform.capabilities.list(listFilters),
    queryFn: () => listPlatformCapabilities(listFilters),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.platform.capabilities.all(),
    });

  const publishMutation = useMutation({
    mutationFn: (id: string) => publishPlatformCapability(id),
    onSuccess: () => {
      toast.success("Capability published");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const draftMutation = useMutation({
    mutationFn: (id: string) => movePlatformCapabilityToDraft(id),
    onSuccess: () => {
      toast.success("Moved to draft");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlatformCapability(id),
    onSuccess: () => {
      toast.success("Capability deleted");
      void invalidate();
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns = useMemo<DataTableColumn<CapabilityListItem>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <Link
            href={`/platform/capabilities/${row.id}`}
            className="font-medium hover:underline"
          >
            {row.name}
          </Link>
        ),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => (
          <StatusBadge status={row.status} domain="capability" />
        ),
      },
      {
        id: "modules",
        header: "Modules",
        cell: (row) => row._count?.modules ?? 0,
      },
      {
        id: "updated",
        header: "Updated",
        sortable: true,
        sortValue: (row) => row.updatedAt,
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {formatUpdatedAt(row.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  const isEmpty = !isLoading && (data?.items.length ?? 0) === 0;

  return (
    <>
      <div className="space-y-6">
        {statsLoading ? (
          <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="min-h-[7.25rem] rounded-lg" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatsCard
              label="Total"
              value={stats.total}
              icon={Layers}
            />
            <StatsCard
              label="Active"
              value={stats.active}
              icon={CheckCircle2}
            />
            <StatsCard
              label="Draft"
              value={stats.draft}
              icon={FileEdit}
            />
          </div>
        ) : null}

        <ListPage
          title="Capabilities"
          description="Bundle platform modules into capability packages for plans and entitlements."
          actions={canManage ? <CreateCapabilityDialog /> : null}
          filters={
            <FilterBar>
              <SearchInput
                value={params.search}
                onChange={(v) =>
                  setParams({ search: v, page: "1" }, { resetPage: true })
                }
                placeholder="Search by name…"
                className="w-full sm:w-64"
              />
              <SearchableSelect
                items={capabilityStatusFilterOptions}
                value={status}
                onValueChange={(v) =>
                  setParams(
                    { status: v ?? "all", page: "1" },
                    { resetPage: true },
                  )
                }
                placeholder="Status"
                triggerClassName="w-[180px]"
              />
            </FilterBar>
          }
          pagination={
            data?.meta && !isEmpty ? (
              <ListPagination
                meta={data.meta}
                page={page}
                onPageChange={(p) => setParams({ page: String(p) })}
                label="capabilities"
              />
            ) : null
          }
        >
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            emptyTitle="No capabilities yet"
            emptyDescription="Create capability bundles and select which platform modules each includes."
            emptyAction={canManage ? <CreateCapabilityDialog /> : undefined}
            rowActions={
              canManage
                ? (row) => {
                    const actions: RowAction[] = [
                      {
                        label: "View",
                        onClick: () =>
                          router.push(`/platform/capabilities/${row.id}`),
                      },
                      {
                        label: "Edit",
                        onClick: () =>
                          router.push(`/platform/capabilities/${row.id}`),
                      },
                    ];
                    if (row.status === "DRAFT") {
                      actions.push({
                        label: "Publish",
                        onClick: () => publishMutation.mutate(row.id),
                      });
                    }
                    if (row.status === "ACTIVE") {
                      actions.push({
                        label: "Move to Draft",
                        onClick: () => draftMutation.mutate(row.id),
                      });
                    }
                    actions.push({
                      label: "Delete permanently",
                      onClick: () => setDeleteTarget(row),
                      destructive: true,
                    });
                    return <DataTableRowActions actions={actions} />;
                  }
                : undefined
            }
          />
        </ListPage>
      </div>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete capability permanently?"
        description={
          <>
            Permanently delete <strong>{deleteTarget?.name}</strong> and all
            related module and feature assignments? This cannot be undone.
          </>
        }
        confirmLabel="Delete permanently"
        isPending={deleteMutation.isPending}
        onConfirm={() =>
          deleteTarget && deleteMutation.mutate(deleteTarget.id)
        }
      />
    </>
  );
}

export function PlatformCapabilitiesPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <PlatformCapabilitiesPageContent />
    </Suspense>
  );
}
