"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { CreateLeadDialog } from "@/features/leads/components/create-lead-dialog";
import { LeadDetailSheet } from "@/features/leads/components/lead-detail-sheet";
import { PipelineBoard } from "@/features/pipelines/components/pipeline-board";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { listLeads } from "@/features/leads/api/leads.api";
import { listPipelines } from "@/features/pipelines/api/pipelines.api";
import {
  invalidateLeadLists,
  invalidatePipelines,
} from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { pipelineSelectOptions } from "@/features/pipelines/utils/select-options";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

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

  const invalidate = () => {
    void invalidatePipelines(queryClient);
    if (pipelineId) {
      void invalidateLeadLists(queryClient);
    }
  };

  const pipelinePickerItems = pipelineSelectOptions(pipelines ?? []);

  const pipelineTableLink =
    leadsData?.meta && leadsData.meta.total > BOARD_LEAD_LIMIT ? (
      <p className="shrink-0 text-xs text-muted-foreground">
        Showing first {BOARD_LEAD_LIMIT} of {leadsData.meta.total} leads.{" "}
        <Link
          href="/business/leads"
          className="underline underline-offset-2 hover:text-foreground"
        >
          View all in table
        </Link>
      </p>
    ) : (
      <Link
        href="/business/leads"
        className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Advanced table view
      </Link>
    );

  return (
    <div className="space-y-[var(--page-stack-gap)]">
      <PageHeader
        filters={
          pipelinesLoading ? (
            <Skeleton className="h-9 w-64 shrink-0" />
          ) : pipelines?.length ? (
            <>
              <SearchableSelect
                items={pipelinePickerItems}
                value={selectedPipeline?.id ?? null}
                onValueChange={(v) => v && setSelectedId(v)}
                placeholder="Select pipeline"
                triggerClassName="w-[min(100%,280px)] shrink-0"
              />
              {pipelineTableLink}
            </>
          ) : undefined
        }
        actions={
          <Button
            onClick={() => setCreateLeadOpen(true)}
            disabled={!selectedPipeline}
          >
            <Plus className="mr-2 size-4" />
            Add lead
          </Button>
        }
      />

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
          pipeline={selectedPipeline}
          leads={leadsData?.items ?? []}
          isLoading={leadsLoading}
          pipelineId={selectedPipeline.id}
          onLeadOpen={setDetailLead}
        />
      ) : null}

      <CreateLeadDialog
        open={createLeadOpen}
        onOpenChange={setCreateLeadOpen}
        defaultPipelineId={selectedPipeline?.id}
        defaultPipelineStageId={getFirstStageId(selectedPipeline ?? undefined)}
        onSuccess={invalidate}
      />

      <LeadDetailSheet
        open={!!detailLead}
        onOpenChange={(open) => !open && setDetailLead(null)}
        lead={detailLead}
        pipeline={selectedPipeline}
        onSuccess={invalidate}
      />
    </div>
  );
}
