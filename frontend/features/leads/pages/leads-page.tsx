"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { CreateLeadDialog } from "@/features/leads/components/create-lead-dialog";
import { LeadDetailSheet } from "@/features/leads/components/lead-detail-sheet";
import { LeadsMobileList } from "@/features/leads/components/mobile/leads-mobile-list";
import { type DataTableColumn } from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { EntityListLayout } from "@/components/layout/entity-list-layout";
import { ListFilterCheckboxGroup } from "@/components/layout/list-filter-checkbox-group";
import { ListPageSkeleton } from "@/components/layout/list-page";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ui/list-pagination";
import { deleteLead, getLead } from "@/features/leads/api/leads.api";
import { useLeadsList } from "@/features/leads/hooks/use-leads-list";
import { listPipelines } from "@/features/pipelines/api/pipelines.api";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { WORKSPACE_ACTIVE_ROW_CLASS } from "@/lib/design/workspace-tokens";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
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
import type { Lead, LeadStatus } from "@/features/leads/types";

const LIST_SCHEMA = {
  page: { default: "1" },
  pipeline: { default: "all" },
  status: { default: "all" },
} as const;

const PAGE_LIMIT = 20;

function BusinessLeadsPageContent() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const {
    selectedId,
    isOpen,
    setSelectedId,
    clearSelection } = useEntitySelection();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftPipeline, setDraftPipeline] = useState(params.pipeline);
  const [draftStatus, setDraftStatus] = useState(params.status);

  const pipelineFilter = params.pipeline;
  const statusFilter = params.status;

  const { data: pipelines } = useQuery({
    queryKey: queryKeys.pipelines.list(),
    queryFn: () => listPipelines() });

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    pipelineId: pipelineFilter !== "all" ? pipelineFilter : undefined,
    status: statusFilter !== "all" ? (statusFilter as LeadStatus) : undefined,
};

  const { data, isLoading } = useLeadsList(listFilters);

  const detailQuery = useQuery({
    queryKey: queryKeys.leads.detail(selectedId ?? ""),
    queryFn: () => getLead(selectedId!),
    enabled: !!selectedId });

  const detailPipeline = useMemo(() => {
    if (!detailQuery.data) return null;
    return (
      pipelines?.find((p) => p.id === detailQuery.data.pipelineId) ?? null
    );
  }, [pipelines, detailQuery.data]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      toast.success("Lead deleted");
      void invalidateLeadLists(queryClient);
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message) });

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
        ) },
      {
        id: "service",
        header: "Service",
        sortable: true,
        sortValue: (row) => getLeadServiceLabel(row),
        cell: (row) => getLeadServiceLabel(row) },
      {
        id: "pipeline",
        header: "Pipeline",
        sortable: true,
        sortValue: (row) => row.pipeline.name,
        cell: (row) => row.pipeline.name },
      {
        id: "stage",
        header: "Stage",
        sortable: true,
        sortValue: (row) => row.pipelineStage.name,
        cell: (row) => row.pipelineStage.name },
      {
        id: "value",
        header: "Value",
        sortable: true,
        sortValue: (row) => row.value ?? 0,
        cell: (row) => formatLeadValue(row.value) },
      {
        id: "status",
        header: "Status",
        sortable: true,
        sortValue: (row) => row.status,
        cell: (row) => <StatusBadge status={row.status} domain="lead" /> },
    ],
    [],
  );

  return (
    <>
      {isMobile ? (
        <LeadsMobileList
          leads={data?.items ?? []}
          isLoading={isLoading}
          selectedId={selectedId}
          onSelect={(lead) => setSelectedId(lead.id)}
          onCreate={() => setCreateOpen(true)}
          pagination={
            data?.meta
              ? {
                  meta: data.meta,
                  page,
                  onPageChange: (p) => setParams({ page: String(p) }),
}
              : undefined
          }
        />
      ) : (
      <EntityListLayout
        title="All leads (table)"
        description="Advanced list view with filters. Day-to-day work happens on the CRM Pipeline board."
        leading={
          <Link
            href="/business/pipelines"
            className="mb-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to CRM Pipeline
          </Link>
        }
        addButtonLabel="New lead"
        onAdd={() => setCreateOpen(true)}
        filterAriaLabel="Lead filters"
        filterActive={pipelineFilter !== "all" || statusFilter !== "all"}
        filterOpen={filterOpen}
        onFilterOpenChange={(open) => {
          if (open) {
            setDraftPipeline(pipelineFilter);
            setDraftStatus(statusFilter);
          }
          setFilterOpen(open);
        }}
        filterContent={
          <>
            <ListFilterCheckboxGroup
              legend="Pipeline"
              options={pipelineFilterItems}
              value={draftPipeline}
              onChange={(next) => setDraftPipeline(String(next))}
            />
            <ListFilterCheckboxGroup
              legend="Status"
              options={leadStatusFilterOptions}
              value={draftStatus}
              onChange={(next) => setDraftStatus(String(next))}
            />
          </>
        }
        onFilterApply={() =>
          setParams(
            { pipeline: draftPipeline, status: draftStatus, page: "1" },
            { resetPage: true },
          )
        }
        footer={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="leads"
            />
          ) : undefined
        }
        columns={columns}
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        density="compact"
        activeRowId={selectedId}
        onRowClick={(row) => setSelectedId(row.id)}
        getRowClassName={(row) =>
          selectedId === row.id ? WORKSPACE_ACTIVE_ROW_CLASS : undefined
        }
        emptyTitle="No leads yet"
        emptyDescription="Create one from a contact or add a new lead."
        emptyAction={
          <Button variant="brand" onClick={() => setCreateOpen(true)}>
            New lead
          </Button>
        }
        rowActions={(lead) => (
            <DataTableRowActions
              actions={[
                { label: "Edit", onClick: () => setSelectedId(lead.id) },
                {
                  label: "Delete",
                  onClick: () => setDeleteId(lead.id),
                  destructive: true },
              ]}
            />
        )}
      />
      )}

      <CreateLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={invalidate}
      />

      <LeadDetailSheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) clearSelection();
        }}
        lead={detailQuery.data ?? null}
        pipeline={detailPipeline}
        isLoading={detailQuery.isLoading}
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
