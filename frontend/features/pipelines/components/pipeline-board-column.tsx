"use client";

import { BoardColumn } from "@/components/board";
import { PipelineLeadCard } from "@/features/pipelines/components/pipeline-lead-card";
import { sumLeadColumnValue } from "@/features/pipelines/components/pipeline-board-utils";
import type { Lead } from "@/features/leads/types";
import type { PipelineStage } from "@/features/pipelines/types";

export function PipelineBoardColumn({
  stage,
  stageLeads,
  overStageId,
  activeLead,
  movingId,
  collapsed,
  onToggleCollapse,
  onLeadOpen,
}: {
  stage: PipelineStage;
  stageLeads: Lead[];
  overStageId: string | null;
  activeLead: Lead | null;
  movingId: string | null;
  collapsed?: boolean;
  onToggleCollapse: () => void;
  onLeadOpen?: (lead: Lead) => void;
}) {
  return (
    <BoardColumn
      key={stage.id}
      id={stage.id}
      droppableData={{ type: "stage", stageId: stage.id }}
      title={stage.name}
      count={stageLeads.length}
      countSingular="Opportunity"
      countPlural="Opportunities"
      totalValue={sumLeadColumnValue(stageLeads)}
      isOver={overStageId === stage.id}
      isDragging={activeLead !== null}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
    >
      {stageLeads.map((lead) => (
        <PipelineLeadCard
          key={lead.id}
          lead={lead}
          isMoving={movingId === lead.id}
          onOpen={onLeadOpen}
        />
      ))}
    </BoardColumn>
  );
}
