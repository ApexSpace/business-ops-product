"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PipelineSettingsPanel } from "@/components/pipelines/pipeline-settings-panel";
import { PageHeader } from "@/components/layout/page-header";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import {
  invalidateLeadLists,
  invalidatePipelines,
} from "@/lib/query-invalidation";
import { canManagePipelines } from "@/lib/permissions";
import { queryKeys } from "@/lib/query-keys";
import { pipelineSelectOptions } from "@/lib/select-options";
import { useAuth } from "@/lib/auth-provider";
import type { Lead, PaginatedResult, Pipeline } from "@/types/api";

const LEAD_COUNT_LIMIT = 100;

export function BusinessPipelinesSettings() {
  const { jwt, contexts } = useAuth();
  const canManage = canManagePipelines(jwt, contexts);
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: pipelines, isLoading } = useQuery({
    queryKey: queryKeys.pipelines.list(),
    queryFn: () => apiClient<Pipeline[]>("pipelines"),
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
      apiClient<PaginatedResult<Lead>>("leads", {
        searchParams: {
          pipelineId: pipelineId!,
          limit: LEAD_COUNT_LIMIT,
          page: 1,
        },
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
