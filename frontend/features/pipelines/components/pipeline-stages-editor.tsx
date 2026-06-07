"use client";

import { useMemo } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { PageSection } from "@/components/layout/page-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/forms/searchable-select";
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

export function createNewPipelineStageRow(): EditablePipelineStage {
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

interface SortableStageRowProps {
  stage: EditablePipelineStage;
  leadCount: number;
  canRemove: boolean;
  disabled?: boolean;
  onUpdate: (
    clientId: string,
    patch: Partial<Pick<EditablePipelineStage, "name" | "type">>,
  ) => void;
  onRemove: (clientId: string) => void;
}

function SortableStageRow({
  stage,
  leadCount,
  canRemove,
  disabled,
  onUpdate,
  onRemove,
}: SortableStageRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.clientId, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-1.5 rounded-md border bg-muted/20 p-2",
        isDragging && "z-10 border-primary/40 bg-background shadow-md",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-7 shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        disabled={disabled}
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder stage"
      >
        <GripVertical className="size-4" />
      </Button>

      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_7rem]">
        <Input
          value={stage.name}
          onChange={(e) => onUpdate(stage.clientId, { name: e.target.value })}
          placeholder="Stage name"
          disabled={disabled}
          className="min-h-10"
        />
        <SearchableSelect
          items={pipelineStageTypeOptions}
          value={stage.type ?? "OPEN"}
          onValueChange={(v) =>
            onUpdate(stage.clientId, {
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
        onClick={() => onRemove(stage.clientId)}
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
}

interface PipelineStagesEditorProps {
  stages: EditablePipelineStage[];
  onChange: (stages: EditablePipelineStage[]) => void;
  disabled?: boolean;
  /** Stage server IDs with active leads — removal is blocked in the editor. */
  stageLeadCounts?: Record<string, number>;
  /** When false, stage list uses page scroll instead of an inner scrollbar. */
  constrainScroll?: boolean;
  /** When false, hide the inline Add stage action (e.g. when rendered in a page header). */
  showAddStageAction?: boolean;
}

export function PipelineStagesEditor({
  stages,
  onChange,
  disabled,
  stageLeadCounts = {},
  constrainScroll = true,
  showAddStageAction = true,
}: PipelineStagesEditorProps) {
  const stageIds = useMemo(
    () => stages.map((stage) => stage.clientId),
    [stages],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

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
    onChange([...stages, createNewPipelineStageRow()]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex((stage) => stage.clientId === active.id);
    const newIndex = stages.findIndex((stage) => stage.clientId === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    onChange(arrayMove(stages, oldIndex, newIndex));
  };

  return (
    <PageSection
      actions={
        showAddStageAction ? (
          <Button type="button" onClick={addStage} disabled={disabled}>
            <Plus className="mr-2 size-4" />
            Add stage
          </Button>
        ) : undefined
      }
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={stageIds} strategy={verticalListSortingStrategy}>
          <ul
            className={cn(
              "space-y-2 pr-1",
              constrainScroll && "max-h-[min(320px,50vh)] overflow-y-auto",
            )}
          >
            {stages.map((stage) => {
              const leadCount = stage.serverId
                ? (stageLeadCounts[stage.serverId] ?? 0)
                : 0;
              const canRemove =
                stages.length > 1 && leadCount === 0 && !disabled;

              return (
                <SortableStageRow
                  key={stage.clientId}
                  stage={stage}
                  leadCount={leadCount}
                  canRemove={canRemove}
                  disabled={disabled}
                  onUpdate={updateStage}
                  onRemove={removeStage}
                />
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>
    </PageSection>
  );
}
