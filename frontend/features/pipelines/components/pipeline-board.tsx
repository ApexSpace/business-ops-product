"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { BoardScrollArea } from "@/components/board";
import { PipelineLeadCard } from "@/features/pipelines/components/pipeline-lead-card";
import { PipelineBoardColumn } from "@/features/pipelines/components/pipeline-board-column";
import {
  getLeadStageId,
  groupLeadsByStage,
} from "@/features/pipelines/components/pipeline-board-utils";
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
}

export function PipelineBoard({
  pipeline,
  leads: leadsProp,
  isLoading,
  pipelineId,
  onLeadOpen,
}: PipelineBoardProps) {
  const queryClient = useQueryClient();
  const stages = useMemo(
    () => [...pipeline.stages].sort((a, b) => a.position - b.position),
    [pipeline.stages],
  );

  const [boardLeads, setBoardLeads] = useState(leadsProp);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    setBoardLeads(leadsProp);
  }, [leadsProp]);

  const leadsByStage = useMemo(
    () => groupLeadsByStage(boardLeads, stages, pipeline.id),
    [boardLeads, stages, pipeline.id],
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
    }) =>
      updateLeadStage(leadId, { pipelineStageId }),
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
      setMovingId(null);
    },
    onError: (err: Error) => {
      setBoardLeads(leadsProp);
      setMovingId(null);
      toast.error(err.message);
    },
  });

  const applyStageChange = useCallback(
    (leadId: string, newStageId: string) => {
      const stage = stages.find((s) => s.id === newStageId);
      if (!stage) return;

      setBoardLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? {
                ...l,
                pipelineStageId: newStageId,
                pipelineStage: {
                  id: stage.id,
                  name: stage.name,
                  position: stage.position,
                  type: stage.type,
                },
              }
            : l,
        ),
      );
    },
    [stages],
  );

  const moveLead = useCallback(
    (lead: Lead, targetStageId: string) => {
      const currentStageId = getLeadStageId(lead);
      if (targetStageId === currentStageId) return;

      const previousLeads = boardLeads;
      setMovingId(lead.id);
      applyStageChange(lead.id, targetStageId);

      moveMutation.mutate(
        { leadId: lead.id, pipelineStageId: targetStageId },
        {
          onSuccess: () => {
            toast.success("Lead moved");
          },
          onError: () => {
            setBoardLeads(previousLeads);
            void invalidateLeadPipeline(queryClient, pipelineId);
          },
        },
      );
    },
    [applyStageChange, boardLeads, moveMutation, pipelineId, queryClient],
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

  if (isLoading) {
    return (
      <BoardScrollArea>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[420px] w-[340px] shrink-0 rounded-xl" />
        ))}
      </BoardScrollArea>
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
      <BoardScrollArea className="min-h-[calc(100vh-14rem)]">
        {stages.map((stage) => (
          <PipelineBoardColumn
            key={stage.id}
            stage={stage}
            stageLeads={leadsByStage.get(stage.id) ?? []}
            overStageId={overStageId}
            activeLead={activeLead}
            movingId={movingId}
            collapsed={collapsedStages[stage.id]}
            onToggleCollapse={() => toggleColumn(stage.id)}
            onLeadOpen={onLeadOpen}
          />
        ))}
      </BoardScrollArea>

      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
        {activeLead ? (
          <PipelineLeadCard lead={activeLead} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
