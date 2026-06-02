"use client";

import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreateIndustryDialog } from "@/components/platform/create-industry-dialog";
import { IndustryFormDialog } from "@/components/platform/industry-form-dialog";
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
import { FilterBar } from "@/components/layout/filter-bar";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { ListPagination } from "@/components/ui/list-pagination";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { useListSearchParams } from "@/hooks/use-list-search-params";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { industryStatusFilterOptions } from "@/lib/select-options";
import { useAuth } from "@/lib/auth-provider";
import { canManageIndustries } from "@/lib/permissions";
import type { Industry, PaginatedResult } from "@/types/api";

const LIST_SCHEMA = {
  page: { default: "1" },
  status: { default: "all" },
} as const;

const PAGE_LIMIT = 20;

function PlatformIndustriesPageContent() {
  const { jwt } = useAuth();
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const [editTarget, setEditTarget] = useState<Industry | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Industry | null>(null);
  const canManage = canManageIndustries(jwt?.platformRole);
  const status = params.status;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.platform.industries.list({
      page,
      limit: PAGE_LIMIT,
      status: status !== "all" ? status : undefined,
    }),
    queryFn: () =>
      apiClient<PaginatedResult<Industry>>("platform/industries", {
        searchParams: {
          page,
          limit: PAGE_LIMIT,
          ...(status !== "all" ? { status } : {}),
        },
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient(`platform/industries/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Industry archived");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platform.industries.all(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.industries.active(),
      });
      setArchiveTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns = useMemo<DataTableColumn<Industry>[]>(
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
        id: "labels",
        header: "Labels",
        cell: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.labels.contacts} · {row.labels.leads}
          </span>
        ),
      },
      {
        id: "pipeline",
        header: "Default pipeline",
        cell: (row) => row.pipelineTemplate.pipelineName,
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => <StatusBadge status={row.status} domain="plan" />,
      },
    ],
    [],
  );

  return (
    <>
      <ListPage
        title="Industries"
        description="Define industries for business profiles—sidebar labels and default pipelines for new businesses."
        actions={canManage ? <CreateIndustryDialog /> : null}
        filters={
          <FilterBar>
            <SearchableSelect
              items={industryStatusFilterOptions}
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
              label="industries"
            />
          ) : null
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No industries found"
          rowActions={
            canManage
              ? (row) => {
                  const actions: RowAction[] = [
                    { label: "Edit", onClick: () => setEditTarget(row) },
                  ];
                  if (row.status === "ACTIVE") {
                    actions.push({
                      label: "Archive",
                      onClick: () => setArchiveTarget(row),
                      destructive: true,
                    });
                  }
                  return <DataTableRowActions actions={actions} />;
                }
              : undefined
          }
        />
      </ListPage>

      <IndustryFormDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        industry={editTarget}
      />

      <ConfirmDeleteDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive industry?"
        description={
          <>
            Archive <strong>{archiveTarget?.name}</strong>? It will no longer
            appear when creating or editing businesses. Industries in use cannot
            be archived.
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

export default function PlatformIndustriesPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <PlatformIndustriesPageContent />
    </Suspense>
  );
}
