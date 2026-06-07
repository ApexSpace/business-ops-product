"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PipelineSettingsPanel } from "@/features/pipelines/components/pipeline-settings-panel";
import { getPipeline } from "@/features/pipelines/api/pipelines.api";
import { listLeads } from "@/features/leads/api/leads.api";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import {
  invalidateLeadPipeline,
  invalidatePipelines,
} from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import { useSetPageMetadata } from "@/lib/runtime/page-metadata-context";

const LEAD_COUNT_LIMIT = 100;

interface PipelineEditSettingsProps {
  pipelineId: string;
}

interface PipelineEditableTitleProps {
  name: string;
  onNameChange: (name: string) => void;
  canManage: boolean;
}

function PipelineEditableTitle({
  name,
  onNameChange,
  canManage,
}: PipelineEditableTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setDraft(name);
    }
  }, [name, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      onNameChange(trimmed);
    } else {
      setDraft(name);
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
          }
        }}
        className="h-auto max-w-md border-0 bg-transparent p-0 text-xl font-semibold tracking-tight shadow-none focus-visible:ring-1 sm:text-2xl"
        aria-label="Pipeline name"
      />
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <h1 className="truncate text-page-title">{name}</h1>
      {canManage ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Rename pipeline"
          onClick={() => setEditing(true)}
        >
          <Pencil className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

export function PipelineEditSettings({ pipelineId }: PipelineEditSettingsProps) {
  const queryClient = useQueryClient();
  const setPageMetadata = useSetPageMetadata();
  const canManage = useCan(PERMISSIONS["pipelines.manage"]);

  const { data: pipeline, isLoading } = useQuery({
    queryKey: queryKeys.pipelines.detail(pipelineId),
    queryFn: () => getPipeline(pipelineId),
  });

  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: queryKeys.leads.pipeline(pipelineId),
    queryFn: () =>
      listLeads({
        pipelineId,
        limit: LEAD_COUNT_LIMIT,
        page: 1,
      }),
    enabled: Boolean(pipeline),
  });

  const [pipelineName, setPipelineName] = useState("");
  const [stageActions, setStageActions] = useState<{
    addStage: () => void;
    disabled: boolean;
  } | null>(null);

  const handleAddStageReady = useCallback(
    (handlers: { addStage: () => void; disabled: boolean }) => {
      setStageActions(handlers);
    },
    [],
  );

  useEffect(() => {
    if (pipeline) {
      setPipelineName(pipeline.name);
    }
  }, [pipeline?.name]);

  useEffect(() => {
    if (!pipeline) return;
    const name = pipelineName || pipeline.name;
    setPageMetadata({
      title: name,
      breadcrumbs: [
        { label: "Settings", href: "/business/settings/profile" },
        { label: "Pipelines", href: "/business/settings/pipelines" },
        { label: name },
      ],
    });
  }, [pipeline, pipelineName, setPageMetadata]);

  const invalidate = () => {
    void invalidatePipelines(queryClient);
    void invalidateLeadPipeline(queryClient, pipelineId);
    void queryClient.invalidateQueries({
      queryKey: queryKeys.pipelines.detail(pipelineId),
    });
  };

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!pipeline) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Pipeline not found.</p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/business/settings/pipelines" />}
        >
          Back to pipelines
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-[var(--page-stack-gap)]">
      <div className="flex flex-col gap-2 pb-0.5 sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/business/settings/pipelines"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md hover:bg-muted"
            aria-label="Back to pipelines"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <PipelineEditableTitle
              name={pipelineName || pipeline.name}
              onNameChange={setPipelineName}
              canManage={canManage}
            />
          </div>
        </div>
        {canManage ? (
          <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2 sm:ml-auto">
            <Button
              type="button"
              onClick={() => stageActions?.addStage()}
              disabled={!stageActions || stageActions.disabled}
            >
              <Plus className="mr-2 size-4" />
              Add stage
            </Button>
          </div>
        ) : null}
      </div>

      {leadsLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <PipelineSettingsPanel
          pipeline={pipeline}
          leads={leadsData?.items ?? []}
          canManage={canManage}
          onSuccess={invalidate}
          name={pipelineName || pipeline.name}
          onAddStageReady={handleAddStageReady}
        />
      )}
    </div>
  );
}
