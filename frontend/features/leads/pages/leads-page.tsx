"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { CreateLeadDialog } from "@/features/leads/components/create-lead-dialog";
import { LeadFormDialog } from "@/features/leads/components/lead-form-dialog";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { FilterBar } from "@/components/layout/filter-bar";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ui/list-pagination";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { deleteLead } from "@/features/leads/api/leads.api";
import { useLeadsList } from "@/features/leads/hooks/use-leads-list";
import { listPipelines } from "@/features/pipelines/api/pipelines.api";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import {
  formatLeadValue,
  getLeadDisplayTitle,
  getLeadServiceLabel,
} from "@/features/leads/utils/leads";
import {
  invalidateLeadLists,
  invalidatePipelines,
} from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { leadStatusFilterOptions } from "@/features/leads/utils/select-options";
import { pipelineSelectOptions } from "@/features/pipelines/utils/select-options";
import type { Lead, LeadStatus, Pipeline } from "@/features/leads/types";

const LIST_SCHEMA = {
  page: { default: "1" },
  pipeline: { default: "all" },
  status: { default: "all" },
} as const;

const PAGE_LIMIT = 20;

function BusinessLeadsPageContent() {
  const queryClient = useQueryClient();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const pipelineFilter = params.pipeline;
  const statusFilter = params.status;

  const { data: pipelines } = useQuery({
    queryKey: queryKeys.pipelines.list(),
    queryFn: () => listPipelines(),
  });

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    pipelineId: pipelineFilter !== "all" ? pipelineFilter : undefined,
    status: statusFilter !== "all" ? (statusFilter as LeadStatus) : undefined,
  };

  const { data, isLoading } = useLeadsList(listFilters);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      toast.success("Lead deleted");
      void invalidateLeadLists(queryClient);
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const invalidate = () => {
    void invalidateLeadLists(queryClient);
    void invalidatePipelines(queryClient);
  };

  const pipelineFilterItems = useMemo(
    () => pipelineSelectOptions(pipelines ?? [], { includeAll: true }),
    [pipelines],
  );

  const columns = useMemo<DataTableColumn<Lead>[]>(
    () => [
      {
        id: "lead",
        header: "Lead",
        sortable: true,
        sortValue: (row) => getLeadDisplayTitle(row),
        cell: (row) => (
          <span className="font-medium">{getLeadDisplayTitle(row)}</span>
        ),
      },
      {
        id: "service",
        header: "Service",
        sortable: true,
        sortValue: (row) => getLeadServiceLabel(row),
        cell: (row) => getLeadServiceLabel(row),
      },
      {
        id: "pipeline",
        header: "Pipeline",
        sortable: true,
        sortValue: (row) => row.pipeline.name,
        cell: (row) => row.pipeline.name,
      },
      {
        id: "stage",
        header: "Stage",
        sortable: true,
        sortValue: (row) => row.pipelineStage.name,
        cell: (row) => row.pipelineStage.name,
      },
      {
        id: "value",
        header: "Value",
        sortable: true,
        sortValue: (row) => row.value ?? 0,
        cell: (row) => formatLeadValue(row.value),
      },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => <StatusBadge status={row.status} domain="lead" />,
      },
    ],
    [],
  );

  return (
    <>
      <Link
        href="/business/pipelines"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to CRM Pipeline
      </Link>
      <ListPage
        title="All leads (table)"
        description="Advanced list view with filters. Day-to-day work happens on the CRM Pipeline board."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            New lead
          </Button>
        }
        filters={
          <FilterBar>
            <SearchableSelect
              items={pipelineFilterItems}
              value={pipelineFilter}
              onValueChange={(v) =>
                setParams({ pipeline: v ?? "all", page: "1" }, { resetPage: true })
              }
              placeholder="All pipelines"
              triggerClassName="w-[200px]"
            />
            <SearchableSelect
              items={leadStatusFilterOptions}
              value={statusFilter}
              onValueChange={(v) =>
                setParams({ status: v ?? "all", page: "1" }, { resetPage: true })
              }
              placeholder="All statuses"
              triggerClassName="w-[160px]"
            />
          </FilterBar>
        }
        pagination={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="leads"
            />
          ) : null
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No leads yet"
          emptyDescription="Create one from a contact or add a new lead."
          rowActions={(lead) => (
            <DataTableRowActions
              actions={[
                { label: "Edit", onClick: () => setEditing(lead) },
                {
                  label: "Delete",
                  onClick: () => setDeleteId(lead.id),
                  destructive: true,
                },
              ]}
            />
          )}
        />
      </ListPage>

      <CreateLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={invalidate}
      />

      <LeadFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        lead={editing}
        onSuccess={invalidate}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete lead?"
        description="This action cannot be undone."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </>
  );
}

export function LeadsPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <BusinessLeadsPageContent />
    </Suspense>
  );
}
