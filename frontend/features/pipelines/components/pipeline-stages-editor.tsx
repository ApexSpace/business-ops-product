"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SearchableSelect,
} from "@/components/forms/searchable-select";
import { cn } from "@/lib/utils";
import { pipelineStageTypeOptions } from "@/features/pipelines/utils/select-options";
import type { Pipeline, PipelineStage, PipelineStageType } from "@/features/pipelines/types";

export type EditablePipelineStage = {
  clientId: string;
  serverId?: string;
  name: string;
  type: PipelineStageType | null;
  isNew: boolean;
};

function fromPipelineStages(stages: PipelineStage[]): EditablePipelineStage[] {
  return [...stages]
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      clientId: s.id,
      serverId: s.id,
      name: s.name,
      type: s.type,
      isNew: false,
    }));
}

function newStageRow(): EditablePipelineStage {
  return {
    clientId: `new-${crypto.randomUUID()}`,
    name: "",
    type: "OPEN",
    isNew: true,
  };
}

export function stagesFromPipeline(pipeline: Pipeline): EditablePipelineStage[] {
  return fromPipelineStages(pipeline.stages);
}

export function validateStages(stages: EditablePipelineStage[]): string | null {
  if (stages.length === 0) {
    return "Add at least one stage";
  }
  const empty = stages.find((s) => !s.name.trim());
  if (empty) return "Every stage needs a name";
  const names = stages.map((s) => s.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) {
    return "Stage names must be unique";
  }
  return null;
}

interface PipelineStagesEditorProps {
  stages: EditablePipelineStage[];
  onChange: (stages: EditablePipelineStage[]) => void;
  disabled?: boolean;
  /** Stage server IDs with active leads — removal is blocked in the editor. */
  stageLeadCounts?: Record<string, number>;
  /** When false, stage list uses page scroll instead of an inner scrollbar. */
  constrainScroll?: boolean;
}

export function PipelineStagesEditor({
  stages,
  onChange,
  disabled,
  stageLeadCounts = {},
  constrainScroll = true,
}: PipelineStagesEditorProps) {
  const move = (index: number, direction: -1 | 1) => {
    const next = [...stages];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const updateStage = (
    clientId: string,
    patch: Partial<Pick<EditablePipelineStage, "name" | "type">>,
  ) => {
    onChange(
      stages.map((s) => (s.clientId === clientId ? { ...s, ...patch } : s)),
    );
  };

  const removeStage = (clientId: string) => {
    if (stages.length <= 1) return;
    const stage = stages.find((s) => s.clientId === clientId);
    if (stage?.serverId && (stageLeadCounts[stage.serverId] ?? 0) > 0) {
      return;
    }
    onChange(stages.filter((s) => s.clientId !== clientId));
  };

  const addStage = () => {
    onChange([...stages, newStageRow()]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Stages</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addStage}
          disabled={disabled}
        >
          <Plus className="mr-1 size-3.5" />
          Add stage
        </Button>
      </div>

      <ul
        className={cn(
          "space-y-2 pr-1",
          constrainScroll && "max-h-[min(320px,50vh)] overflow-y-auto",
        )}
      >
        {stages.map((stage, index) => {
          const leadCount = stage.serverId
            ? (stageLeadCounts[stage.serverId] ?? 0)
            : 0;
          const canRemove =
            stages.length > 1 && leadCount === 0 && !disabled;

          return (
          <li
            key={stage.clientId}
            className="flex items-start gap-1.5 rounded-md border bg-muted/20 p-2"
          >
            <div className="flex shrink-0 flex-col gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
                aria-label="Move stage up"
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                disabled={disabled || index === stages.length - 1}
                onClick={() => move(index, 1)}
                aria-label="Move stage down"
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>

            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_7rem]">
              <Input
                value={stage.name}
                onChange={(e) =>
                  updateStage(stage.clientId, { name: e.target.value })
                }
                placeholder="Stage name"
                disabled={disabled}
                className="min-h-10"
              />
              <SearchableSelect
                items={pipelineStageTypeOptions}
                value={stage.type ?? "OPEN"}
                onValueChange={(v) =>
                  updateStage(stage.clientId, {
                    type: (v as PipelineStageType) ?? "OPEN",
                  })
                }
                disabled={disabled}
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
              disabled={!canRemove}
              onClick={() => removeStage(stage.clientId)}
              aria-label="Remove stage"
              title={
                leadCount > 0
                  ? "Move or delete leads in this stage first"
                  : undefined
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        Use arrows to reorder. Stages with leads cannot be removed until those
        leads are moved. Changes apply when you save.
      </p>
    </div>
  );
}
