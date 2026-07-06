"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PipelineLeadCard } from "@/features/pipelines/components/pipeline-lead-card";
import { PipelineBoardColumn } from "@/features/pipelines/components/pipeline-board-column";
import {
  getLeadStageId,
  groupLeadsByStage,
} from "@/features/pipelines/components/pipeline-board-utils";
import { getPipelineStageAccent } from "@/features/pipelines/utils/pipeline-stage-colors";
import { Skeleton } from "@/components/ui/skeleton";
import { invalidateLeadLists, invalidateLeadPipeline } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import type { Lead } from "@/features/leads/types";
import type { PaginatedResult, Pipeline } from "@/features/pipelines/types";
import { updateLeadStage } from "@/features/leads/api/leads.api";

interface PipelineBoardProps {
  pipeline: Pipeline;
  leads: Lead[];
  isLoading: boolean;
  pipelineId: string;
  onLeadOpen?: (lead: Lead) => void;
  onLeadEdit?: (lead: Lead) => void;
  onLeadDelete?: (lead: Lead) => void;
  onAddLead?: (stageId: string) => void;
}

export function PipelineBoard({
  pipeline,
  leads: leadsProp,
  isLoading,
  pipelineId,
  onLeadOpen,
  onLeadEdit,
  onLeadDelete,
  onAddLead,
}: PipelineBoardProps) {
  const queryClient = useQueryClient();
  const stages = useMemo(
    () => [...pipeline.stages].sort((a, b) => a.position - b.position),
    [pipeline.stages],
  );

  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({});
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>(
    {},
  );

  const boardLeads = useMemo(() => {
    if (Object.keys(stageOverrides).length === 0) return leadsProp;

    return leadsProp.map((lead) => {
      const overrideStageId = stageOverrides[lead.id];
      if (!overrideStageId) return lead;

      const stage = stages.find((s) => s.id === overrideStageId);
      if (!stage) return lead;

      return {
        ...lead,
        pipelineStageId: overrideStageId,
        pipelineStage: {
          id: stage.id,
          name: stage.name,
          position: stage.position,
          type: stage.type,
        },
      };
    });
  }, [leadsProp, stageOverrides, stages]);

  const leadsByStage = useMemo(
    () => groupLeadsByStage(boardLeads, stages, pipeline.id),
    [boardLeads, stages, pipeline.id],
  );

  const stageAccents = useMemo(
    () => stages.map((stage, index) => getPipelineStageAccent(stage, index)),
    [stages],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const moveMutation = useMutation({
    mutationFn: ({
      leadId,
      pipelineStageId,
    }: {
      leadId: string;
      pipelineStageId: string;
    }) => updateLeadStage(leadId, { pipelineStageId }),
    onSuccess: (updatedLead) => {
      queryClient.setQueryData<PaginatedResult<Lead>>(
        queryKeys.leads.pipeline(pipelineId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((l) =>
              l.id === updatedLead.id ? updatedLead : l,
            ),
          };
        },
      );
      void invalidateLeadLists(queryClient);
      setStageOverrides((prev) => {
        const next = { ...prev };
        delete next[updatedLead.id];
        return next;
      });
      setMovingId(null);
    },
    onError: (err: Error) => {
      setStageOverrides({});
      setMovingId(null);
      toast.error(err.message);
    },
  });

  const applyStageChange = useCallback((leadId: string, newStageId: string) => {
    setStageOverrides((prev) => ({ ...prev, [leadId]: newStageId }));
  }, []);

  const moveLead = useCallback(
    (lead: Lead, targetStageId: string) => {
      const currentStageId = getLeadStageId(lead);
      if (targetStageId === currentStageId) return;

      setMovingId(lead.id);
      applyStageChange(lead.id, targetStageId);

      moveMutation.mutate(
        { leadId: lead.id, pipelineStageId: targetStageId },
        {
          onSuccess: () => {
            toast.success("Lead moved");
          },
          onError: () => {
            setStageOverrides((prev) => {
              const next = { ...prev };
              delete next[lead.id];
              return next;
            });
            void invalidateLeadPipeline(queryClient, pipelineId);
          },
        },
      );
    },
    [applyStageChange, moveMutation, pipelineId, queryClient],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const lead = boardLeads.find((l) => l.id === event.active.id);
    setActiveLead(lead ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id;
    if (typeof overId === "string" && stages.some((s) => s.id === overId)) {
      setOverStageId(overId);
      return;
    }
    if (overId) {
      const overLead = boardLeads.find((l) => l.id === overId);
      if (overLead) {
        setOverStageId(getLeadStageId(overLead));
        return;
      }
    }
    setOverStageId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLead(null);
    setOverStageId(null);

    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const lead = boardLeads.find((l) => l.id === leadId);
    if (!lead) return;

    let targetStageId = String(over.id);
    if (!stages.some((s) => s.id === targetStageId)) {
      const overLead = boardLeads.find((l) => l.id === targetStageId);
      if (!overLead) return;
      targetStageId = getLeadStageId(overLead);
    }

    moveLead(lead, targetStageId);
  };

  const handleDragCancel = () => {
    setActiveLead(null);
    setOverStageId(null);
  };

  const toggleColumn = (stageId: string) => {
    setCollapsedStages((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  };

  const activeAccent = activeLead
    ? stageAccents[
        Math.max(
          0,
          stages.findIndex((s) => s.id === getLeadStageId(activeLead)),
        )
      ]
    : null;

  if (isLoading) {
    return (
      <div className="scrollbar-thin flex min-h-0 gap-4 overflow-x-auto overflow-y-hidden pb-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[420px] w-[312px] shrink-0 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No stages yet. Add a stage to start organizing leads.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="scrollbar-thin flex min-h-[calc(100vh-14rem)] items-start gap-[18px] overflow-x-auto overflow-y-hidden pb-3">
        {stages.map((stage, index) => (
          <PipelineBoardColumn
            key={stage.id}
            stage={stage}
            stageLeads={leadsByStage.get(stage.id) ?? []}
            accent={stageAccents[index]}
            overStageId={overStageId}
            activeLead={activeLead}
            movingId={movingId}
            collapsed={collapsedStages[stage.id]}
            onToggleCollapse={() => toggleColumn(stage.id)}
            onLeadOpen={onLeadOpen}
            onLeadEdit={onLeadEdit}
            onLeadDelete={onLeadDelete}
            onAddLead={onAddLead}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
        {activeLead && activeAccent ? (
          <PipelineLeadCard
            lead={activeLead}
            accentColor={activeAccent.accentColor}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
