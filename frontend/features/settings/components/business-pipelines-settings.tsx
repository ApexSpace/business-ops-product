"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PipelineSettingsPanel } from "@/features/pipelines/components/pipeline-settings-panel";
import { PageHeader } from "@/components/layout/page-header";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  invalidateLeadLists,
  invalidatePipelines,
} from "@/lib/query/invalidation";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { queryKeys } from "@/lib/query/keys";
import { pipelineSelectOptions } from "@/features/pipelines/utils/select-options";
import type { Lead } from "@/features/leads/types";
import type { PaginatedResult, Pipeline } from "@/features/pipelines/types";
import { listLeads } from "@/features/leads/api/leads.api";
import { listPipelines } from "@/features/pipelines/api/pipelines.api";

const LEAD_COUNT_LIMIT = 100;

export function BusinessPipelinesSettings() {
  const canManage = useCan(PERMISSIONS["pipelines.manage"]);
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: pipelines, isLoading } = useQuery({
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

  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: queryKeys.leads.pipeline(pipelineId ?? ""),
    queryFn: () =>
      listLeads({
        pipelineId: pipelineId!,
        limit: LEAD_COUNT_LIMIT,
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

  const handleDeleted = (deletedId: string) => {
    if (selectedId === deletedId) {
      setSelectedId(null);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-[var(--page-stack-gap)]">
      <PageHeader
        description="Define pipeline names and stages. Day-to-day lead work happens on the CRM board."
        filters={
          isLoading ? (
            <Skeleton className="h-9 w-64 shrink-0" />
          ) : pipelines?.length ? (
            <>
              <span className="shrink-0 text-sm text-muted-foreground">
                Editing
              </span>
              <SearchableSelect
                items={pipelineSelectOptions(pipelines)}
                value={selectedPipeline?.id ?? null}
                onValueChange={(v) => v && setSelectedId(v)}
                placeholder="Select pipeline"
                triggerClassName="w-[min(100%,280px)] shrink-0"
              />
            </>
          ) : undefined
        }
        actions={
          <Link
            href="/business/pipelines"
            className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Open CRM Pipeline
          </Link>
        }
      />

      {!isLoading && !pipelines?.length ? (
        <p className="text-sm text-muted-foreground">
          No pipelines yet.{" "}
          {canManage
            ? "Create one below once a default pipeline is provisioned for your business."
            : "Ask an owner or admin to set up pipelines."}
        </p>
      ) : (
        <>
          {selectedPipeline && !leadsLoading ? (
            <PipelineSettingsPanel
              pipeline={selectedPipeline}
              leads={leadsData?.items ?? []}
              canManage={canManage}
              onSuccess={invalidate}
              onDeleted={handleDeleted}
            />
          ) : (
            <Skeleton className="h-48 w-full" />
          )}
        </>
      )}
    </div>
  );
}
