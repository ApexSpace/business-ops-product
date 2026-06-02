"use client";

import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreatePlanDialog } from "@/components/platform/create-plan-dialog";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { FilterBar } from "@/components/layout/filter-bar";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { ListPagination } from "@/components/ui/list-pagination";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { useListSearchParams } from "@/hooks/use-list-search-params";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { planStatusFilterOptions } from "@/lib/select-options";
import { useAuth } from "@/lib/auth-provider";
import { canManagePlans } from "@/lib/permissions";
import type { PaginatedResult, Plan } from "@/types/api";

const LIST_SCHEMA = {
  page: { default: "1" },
  status: { default: "all" },
} as const;

const PAGE_LIMIT = 20;

function PlatformPlansPageContent() {
  const { jwt } = useAuth();
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const [archiveTarget, setArchiveTarget] = useState<Plan | null>(null);
  const canManage = canManagePlans(jwt?.platformRole);
  const status = params.status;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.platform.plans.list({
      page,
      limit: PAGE_LIMIT,
      status: status !== "all" ? status : undefined,
    }),
    queryFn: () =>
      apiClient<PaginatedResult<Plan>>("platform/plans", {
        searchParams: {
          page,
          limit: PAGE_LIMIT,
          ...(status !== "all" ? { status } : {}),
        },
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`platform/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Plan archived");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.plans.all(),
      });
      setArchiveTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns = useMemo<DataTableColumn<Plan>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <div>
            <p className="font-medium">{row.name}</p>
            {row.description ? (
              <p className="text-sm text-muted-foreground">{row.description}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: "monthly",
        header: "Monthly",
        sortable: true,
        sortValue: (row) => row.priceMonthly,
        cell: (row) => `$${row.priceMonthly}/mo`,
      },
      {
        id: "yearly",
        header: "Yearly",
        cell: (row) => (row.priceYearly ? `$${row.priceYearly}/yr` : "—"),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => <StatusBadge status={row.status} domain="plan" />,
      },
      {
        id: "features",
        header: "Features",
        className: "max-w-xs",
        cell: (row) => (
          <span className="truncate text-muted-foreground">
            {row.features?.join(", ") || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <ListPage
        title="Plans"
        description="SaaS packages and pricing tiers."
        actions={canManage ? <CreatePlanDialog /> : null}
        filters={
          <FilterBar>
            <SearchableSelect
              items={planStatusFilterOptions}
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
              label="plans"
            />
          ) : null
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No plans found"
          rowActions={
            canManage
              ? (plan) =>
                  plan.status === "ACTIVE" ? (
                    <DataTableRowActions
                      actions={[
                        {
                          label: "Archive",
                          onClick: () => setArchiveTarget(plan),
                          destructive: true,
                        },
                      ]}
                    />
                  ) : null
              : undefined
          }
        />
      </ListPage>

      <ConfirmDeleteDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive plan?"
        description={
          <>
            Archive <strong>{archiveTarget?.name}</strong>? Existing
            subscriptions are not affected.
          </>
        }
        confirmLabel="Archive"
        isPending={deleteMutation.isPending}
        onConfirm={() =>
          archiveTarget && deleteMutation.mutate(archiveTarget.id)
        }
      />
    </>
  );
}

export default function PlatformPlansPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <PlatformPlansPageContent />
    </Suspense>
  );
}
