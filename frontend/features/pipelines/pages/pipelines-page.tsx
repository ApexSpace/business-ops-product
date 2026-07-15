"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { CreateLeadDialog } from "@/features/leads/components/create-lead-dialog";
import { LeadDetailSheet } from "@/features/leads/components/lead-detail-sheet";
import { PipelineBoard } from "@/features/pipelines/components/pipeline-board";
import { PipelineViewToggle } from "@/features/pipelines/components/pipeline-view-toggle";
import { usePipelineStaffPermissions } from "@/features/pipelines/hooks/use-pipeline-staff-permissions";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteLead, listLeads } from "@/features/leads/api/leads.api";
import { listPipelines } from "@/features/pipelines/api/pipelines.api";
import {
  invalidateLeadLists,
  invalidatePipelines,
} from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { pipelineSelectOptions } from "@/features/pipelines/utils/select-options";
import { WORKSPACE_TOOLBAR_SURFACE_CLASS } from "@/lib/design/workspace-tokens";
import { cn } from "@/lib/utils";
import type { Lead } from "@/features/leads/types";
import type { Pipeline } from "@/features/pipelines/types";

/** Kanban board loads one page of leads per pipeline (not full table scan). */
const BOARD_LEAD_LIMIT = 100;

function getFirstStageId(pipeline?: Pipeline): string {
  if (!pipeline?.stages.length) return "";
  return [...pipeline.stages].sort((a, b) => a.position - b.position)[0].id;
}

export function BusinessCrmPipelinePage() {
  const queryClient = useQueryClient();
  const { canManage } = usePipelineStaffPermissions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [createLeadStageId, setCreateLeadStageId] = useState<string | undefined>();
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [deleteLeadTarget, setDeleteLeadTarget] = useState<Lead | null>(null);

  const { data: pipelines, isLoading: pipelinesLoading } = useQuery({
    queryKey: queryKeys.pipelines.list(),
    queryFn: () => listPipelines(),
  });

  const selectedPipeline = useMemo(() => {
    if (!pipelines?.length) return null;
    if (selectedId) {
      return pipelines.find((p) => p.id === selectedId) ?? pipelines[0];
    }
    return pipelines.find((p) => p.isDefault) ?? pipelines[0];
  }, [pipelines, selectedId]);

  useEffect(() => {
    if (selectedPipeline && !selectedId) {
      setSelectedId(selectedPipeline.id);
    }
  }, [selectedPipeline, selectedId]);

  const pipelineId = selectedPipeline?.id;

  const {
    data: leadsData,
    isLoading: leadsLoading,
    isError: leadsError,
  } = useQuery({
    queryKey: queryKeys.leads.pipeline(pipelineId ?? ""),
    queryFn: () =>
      listLeads({
        pipelineId: pipelineId!,
        limit: BOARD_LEAD_LIMIT,
        page: 1,
      }),
    enabled: !!pipelineId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLead(id),
    onSuccess: () => {
      toast.success("Lead deleted");
      invalidate();
      setDeleteLeadTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const invalidate = () => {
    void invalidatePipelines(queryClient);
    if (pipelineId) {
      void invalidateLeadLists(queryClient);
    }
  };

  const pipelinePickerItems = pipelineSelectOptions(pipelines ?? []);

  const openAddLead = (stageId?: string) => {
    setCreateLeadStageId(stageId);
    setCreateLeadOpen(true);
  };

  const overflowHint =
    leadsData?.meta && leadsData.meta.total > BOARD_LEAD_LIMIT ? (
      <p className="text-xs text-muted-foreground">
        Showing first {BOARD_LEAD_LIMIT} of {leadsData.meta.total} leads.{" "}
        <Link
          href="/business/leads"
          className="font-medium text-primary hover:underline"
        >
          View all in table
        </Link>
      </p>
    ) : null;

  return (
    <div className="space-y-[var(--page-stack-gap)]">
      <PageHeader
        actions={
          canManage ? (
            <Button
              onClick={() => openAddLead()}
              disabled={!selectedPipeline}
            >
              <Plus className="mr-2 size-4" />
              Add lead
            </Button>
          ) : null
        }
      />

      {pipelinesLoading ? (
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-[var(--control-height)] w-64 shrink-0" />
          <Skeleton className="h-[var(--control-height)] w-56 shrink-0" />
        </div>
      ) : pipelines?.length ? (
        <div
          className={cn(
            WORKSPACE_TOOLBAR_SURFACE_CLASS,
            "flex-row flex-wrap items-center gap-3",
          )}
        >
          <SearchableSelect
            items={pipelinePickerItems}
            value={selectedPipeline?.id ?? null}
            onValueChange={(v) => v && setSelectedId(v)}
            placeholder="Select pipeline"
            triggerClassName="h-[var(--control-height)] w-[min(100%,280px)] shrink-0 font-semibold"
          />
          <PipelineViewToggle />
          {overflowHint ? (
            <div className="ml-auto w-full sm:w-auto">{overflowHint}</div>
          ) : null}
        </div>
      ) : null}

      {!pipelinesLoading && !pipelines?.length ? (
        <p className="text-sm text-muted-foreground">
          No pipelines yet.{" "}
          <Link
            href="/business/settings/pipelines"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Configure pipelines in Settings
          </Link>
          .
        </p>
      ) : null}

      {leadsError ? (
        <p className="text-sm text-destructive">
          Could not load leads for this pipeline.
        </p>
      ) : null}

      {selectedPipeline ? (
        <PipelineBoard
          key={selectedPipeline.id}
          pipeline={selectedPipeline}
          leads={leadsData?.items ?? []}
          isLoading={leadsLoading}
          pipelineId={selectedPipeline.id}
          onLeadOpen={setDetailLead}
          onLeadEdit={canManage ? setDetailLead : undefined}
          onLeadDelete={canManage ? setDeleteLeadTarget : undefined}
          onAddLead={canManage ? openAddLead : undefined}
        />
      ) : null}

      {canManage ? (
        <CreateLeadDialog
          open={createLeadOpen}
          onOpenChange={setCreateLeadOpen}
          defaultPipelineId={selectedPipeline?.id}
          defaultPipelineStageId={
            createLeadStageId ?? getFirstStageId(selectedPipeline ?? undefined)
          }
          onSuccess={invalidate}
        />
      ) : null}
      <LeadDetailSheet
        open={!!detailLead}
        onOpenChange={(open) => !open && setDetailLead(null)}
        lead={detailLead}
        pipeline={selectedPipeline}
        onSuccess={invalidate}
      />

      <ConfirmDeleteDialog
        open={!!deleteLeadTarget}
        onOpenChange={(open) => !open && setDeleteLeadTarget(null)}
        title="Delete lead"
        description="This lead will be permanently removed from the pipeline."
        onConfirm={() => {
          if (deleteLeadTarget) {
            deleteMutation.mutate(deleteLeadTarget.id);
          }
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
