"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, CheckCircle2, FileEdit, TableProperties } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreatePlanGroupDialog } from "@/features/platform/components/plan-groups/create-plan-group-dialog";
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
  deletePlatformPlanGroup,
  getPlatformPlanGroupStats,
  listPlatformPlanGroups,
  movePlatformPlanGroupToDraft,
  publishPlatformPlanGroup,
} from "@/features/platform/api/plan-groups.api";
import { queryKeys } from "@/lib/query/keys";
import { planGroupStatusFilterOptions } from "@/features/platform/utils/select-options";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import type { PlanGroupListItem } from "@/features/platform/types/plan-group";
import { getPricingEmbedCode } from "@/lib/config/public-backend-url";

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

function PlatformPlanGroupsPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [deleteTarget, setDeleteTarget] = useState<PlanGroupListItem | null>(
    null,
  );
  const canManage = useCan(PERMISSIONS["platform.plan_groups.manage"]);
  const status = params.status;

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    status: status !== "all" ? status : undefined,
    search: debouncedSearch || undefined,
  };

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.platform.planGroups.stats(),
    queryFn: () => getPlatformPlanGroupStats(),
  });

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.platform.planGroups.list(listFilters),
    queryFn: () => listPlatformPlanGroups(listFilters),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.platform.planGroups.all(),
    });

  const publishMutation = useMutation({
    mutationFn: (id: string) => publishPlatformPlanGroup(id),
    onSuccess: () => {
      toast.success("Plan group published");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const draftMutation = useMutation({
    mutationFn: (id: string) => movePlatformPlanGroupToDraft(id),
    onSuccess: () => {
      toast.success("Moved to draft");
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePlatformPlanGroup(id),
    onSuccess: () => {
      toast.success("Plan group deleted");
      void invalidate();
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns = useMemo<DataTableColumn<PlanGroupListItem>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <Link
            href={`/platform/plan-groups/${row.id}`}
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
          <StatusBadge status={row.status} domain="planGroup" />
        ),
      },
      {
        id: "tiers",
        header: "Tiers",
        cell: (row) => row._count?.tiers ?? 0,
      },
      {
        id: "currency",
        header: "Currency",
        cell: (row) => row.currency,
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
          <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="min-h-[7.25rem] rounded-lg" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard label="Total" value={stats.total} icon={TableProperties} />
            <StatsCard
              label="Published"
              value={stats.published}
              icon={CheckCircle2}
            />
            <StatsCard label="Draft" value={stats.draft} icon={FileEdit} />
            <StatsCard label="Archived" value={stats.archived} icon={Archive} />
          </div>
        ) : null}

        <ListPage
          title="Plan Groups"
          description="Build marketing pricing tables with tiers, capabilities, comparison rows, and embeddable widgets."
          actions={canManage ? <CreatePlanGroupDialog /> : null}
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
                items={planGroupStatusFilterOptions}
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
                label="plan groups"
              />
            ) : null
          }
        >
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            emptyTitle="No plan groups yet"
            emptyDescription="Create a plan group to build pricing tables and embeds."
            emptyAction={canManage ? <CreatePlanGroupDialog /> : undefined}
            rowActions={
              canManage
                ? (row) => {
                    const actions: RowAction[] = [
                      {
                        label: "View",
                        onClick: () =>
                          router.push(`/platform/plan-groups/${row.id}`),
                      },
                    ];
                    if (row.status === "DRAFT") {
                      actions.push({
                        label: "Publish",
                        onClick: () => publishMutation.mutate(row.id),
                      });
                    }
                    if (row.status === "PUBLISHED") {
                      actions.push({
                        label: "Move to Draft",
                        onClick: () => draftMutation.mutate(row.id),
                      });
                      actions.push({
                        label: "Copy Embed Code",
                        onClick: async () => {
                          const code = getPricingEmbedCode(row.id);
                          if (!code) {
                            toast.error("Public backend URL is not configured");
                            return;
                          }
                          await navigator.clipboard.writeText(code);
                          toast.success("Embed code copied");
                        },
                      });
                    }
                    actions.push({
                      label: "Delete",
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
        title="Delete plan group?"
        description={
          <>
            Permanently delete <strong>{deleteTarget?.name}</strong>? This will
            remove the plan group, tiers, feature rows, and embed settings. This
            action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        isPending={deleteMutation.isPending}
        onConfirm={() =>
          deleteTarget && deleteMutation.mutate(deleteTarget.id)
        }
      />
    </>
  );
}

export function PlatformPlanGroupsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <PlatformPlanGroupsPageContent />
    </Suspense>
  );
}
