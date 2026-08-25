"use client";

import { useDroppable } from "@dnd-kit/core";
import { Inbox, Plus } from "lucide-react";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import { formatBoardColumnTotal } from "@/components/board";
import { PipelineLeadCard } from "@/features/pipelines/components/pipeline-lead-card";
import { sumLeadColumnValue } from "@/features/pipelines/components/pipeline-board-utils";
import type { PipelineStageAccent } from "@/features/pipelines/utils/pipeline-stage-colors";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import type { Lead } from "@/features/leads/types";
import type { PipelineStage } from "@/features/pipelines/types";
import { cn } from "@/lib/utils";

export function PipelineBoardColumn({
  stage,
  stageLeads,
  accent,
  overStageId,
  activeLead,
  movingId,
  collapsed,
  onToggleCollapse,
  onLeadOpen,
  onLeadEdit,
  onLeadDelete,
  onAddLead,
}: {
  stage: PipelineStage;
  stageLeads: Lead[];
  accent: PipelineStageAccent;
  overStageId: string | null;
  activeLead: Lead | null;
  movingId: string | null;
  collapsed?: boolean;
  onToggleCollapse: () => void;
  onLeadOpen?: (lead: Lead) => void;
  onLeadEdit?: (lead: Lead) => void;
  onLeadDelete?: (lead: Lead) => void;
  onAddLead?: (stageId: string) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: stage.id,
    data: { type: "stage", stageId: stage.id },
  });

  const isOver = overStageId === stage.id;
  const isDragging = activeLead !== null;
  const totalValue = sumLeadColumnValue(stageLeads);
  const isEmpty = stageLeads.length === 0;

  return (
    <div className="flex h-full max-h-[calc(100vh-14rem)] w-[312px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-elevation-xs">
      <div className="shrink-0 border-b border-border/60 px-4 pb-3.5 pt-4">
        <div className="flex items-center gap-2">
          <span
            className={cn("size-2 shrink-0 rounded-full", accent.dotClass)}
            aria-hidden
          />
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {stage.name}
          </h3>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
              accent.pillClass,
            )}
          >
            {stageLeads.length}
          </span>
          <IconButton
            type="button"
            aria-label={collapsed ? "Expand column" : "Collapse column"}
            className="size-7 shrink-0 rounded-md border border-border/70 text-muted-foreground hover:bg-muted/50"
            onClick={onToggleCollapse}
          >
            {collapsed ? (
              <NavArrowIcon direction="down" size="md" />
            ) : (
              <NavArrowIcon direction="up" size="md" />
            )}
          </IconButton>
        </div>
        <p className="mt-1.5 pl-4 text-xs text-muted-foreground">
          Total value:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatBoardColumnTotal(totalValue)}
          </span>
        </p>
      </div>

      {!collapsed ? (
        <>
          <div
            ref={setNodeRef}
            className={cn(
              "scrollbar-thin flex min-h-[120px] flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-3 transition-colors",
              isOver && isDragging && "bg-primary-tint/60",
            )}
          >
            {isEmpty ? (
              <div
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 px-3 py-7 text-center",
                  isOver && isDragging && "border-primary/40 bg-primary-tint/40",
                )}
              >
                <Inbox
                  className="size-6 text-muted-foreground/50"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                  No leads in this stage yet
                  {onAddLead ? (
                    <>
                      <br />
                      Drag a card here or add one below
                    </>
                  ) : null}
                </p>
              </div>
            ) : (
              stageLeads.map((lead) => (
                <PipelineLeadCard
                  key={lead.id}
                  lead={lead}
                  accentColor={accent.accentColor}
                  isMoving={movingId === lead.id}
                  onOpen={onLeadOpen}
                  onEdit={onLeadEdit}
                  onDelete={onLeadDelete}
                />
              ))
            )}
          </div>

          {onAddLead ? (
            <div className="shrink-0 px-3 pb-3.5 pt-1">
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-full gap-1.5 rounded-[var(--radius-control)] border border-dashed border-border/80 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:bg-primary-tint/50 hover:text-primary"
                onClick={() => onAddLead(stage.id)}
              >
                <Plus className="size-3.5" aria-hidden />
                Add lead
              </Button>
            </div>
          ) : (
            <div className="shrink-0 pb-3" />
          )}
        </>
      ) : null}
    </div>
  );
}
