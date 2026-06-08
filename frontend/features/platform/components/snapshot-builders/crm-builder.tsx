"use client";

import { useLayoutEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SortableList } from "@/features/platform/components/snapshot-builders/sortable-list";
import { useSnapshotEditor } from "@/features/platform/hooks/use-snapshot-editor";
import type {
  SnapshotPipelineAsset,
  SnapshotPipelineStage,
} from "@/features/platform/types/snapshot";

const STAGE_TYPE_OPTIONS = [
  { value: "OPEN", label: "In progress" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

function newSourceKey(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function ensureStageKeys(stages: SnapshotPipelineStage[]): SnapshotPipelineStage[] {
  return stages.map((stage) =>
    stage.sourceKey ? stage : { ...stage, sourceKey: newSourceKey("stage") },
  );
}

type SortableStage = SnapshotPipelineStage & { id: string };

function stageKeyFor(
  stage: SnapshotPipelineStage,
  pipelineKey: string,
  index: number,
): string {
  return stage.sourceKey ?? `${pipelineKey}-stage-${index}`;
}

function findStageIndex(
  stages: SnapshotPipelineStage[],
  pipelineKey: string,
  stageKey: string,
): number {
  return stages.findIndex(
    (stage, index) => stageKeyFor(stage, pipelineKey, index) === stageKey,
  );
}

function toSortableStages(
  pipelineKey: string,
  stages: SnapshotPipelineStage[],
): SortableStage[] {
  return stages.map((stage, index) => ({
    ...stage,
    id: stageKeyFor(stage, pipelineKey, index),
  }));
}

export function CrmBuilder() {
  const { assets, updateAssets, canManage } = useSnapshotEditor();
  const crm = assets?.crm ?? { pipelines: [], services: [], tags: [] };
  const pipelines = crm.pipelines ?? [];

  const updateCrm = (patch: Partial<typeof crm>) => {
    updateAssets({ crm: { ...crm, ...patch } });
  };

  const updatePipeline = (sourceKey: string, patch: Partial<SnapshotPipelineAsset>) => {
    updateCrm({
      pipelines: pipelines.map((p) =>
        p.sourceKey === sourceKey ? { ...p, ...patch } : p,
      ),
    });
  };

  const addPipeline = () => {
    updateCrm({
      pipelines: [
        ...pipelines,
        {
          sourceKey: newSourceKey("pipeline"),
          name: "New pipeline",
          stages: [
            { sourceKey: newSourceKey("stage"), name: "New lead", type: "OPEN" },
            { sourceKey: newSourceKey("stage"), name: "Won", type: "WON" },
            { sourceKey: newSourceKey("stage"), name: "Lost", type: "LOST" },
          ],
        },
      ],
    });
  };

  const removePipeline = (sourceKey: string) => {
    updateCrm({ pipelines: pipelines.filter((p) => p.sourceKey !== sourceKey) });
  };

  const commitStages = (pipelineKey: string, stages: SnapshotPipelineStage[]) => {
    updatePipeline(pipelineKey, { stages: ensureStageKeys(stages) });
  };

  useLayoutEffect(() => {
    if (!canManage) return;
    for (const pipeline of pipelines) {
      const stages = pipeline.stages ?? [];
      if (stages.some((stage) => !stage.sourceKey)) {
        updatePipeline(pipeline.sourceKey, { stages: ensureStageKeys(stages) });
      }
    }
  }, [pipelines, canManage]);

  const addStage = (pipelineKey: string) => {
    const pipeline = pipelines.find((p) => p.sourceKey === pipelineKey);
    if (!pipeline) return;
    commitStages(pipelineKey, [
      ...(pipeline.stages ?? []),
      { sourceKey: newSourceKey("stage"), name: "New stage", type: "OPEN" },
    ]);
  };

  const updateStage = (
    pipelineKey: string,
    stageKey: string,
    patch: Partial<SnapshotPipelineStage>,
  ) => {
    const pipeline = pipelines.find((p) => p.sourceKey === pipelineKey);
    if (!pipeline) return;
    const stages = pipeline.stages ?? [];
    const index = findStageIndex(stages, pipelineKey, stageKey);
    if (index < 0) return;
    const next = [...stages];
    next[index] = { ...next[index], ...patch };
    commitStages(pipelineKey, next);
  };

  const removeStage = (pipelineKey: string, stageKey: string) => {
    const pipeline = pipelines.find((p) => p.sourceKey === pipelineKey);
    if (!pipeline) return;
    const stages = pipeline.stages ?? [];
    const index = findStageIndex(stages, pipelineKey, stageKey);
    if (index < 0) return;
    commitStages(
      pipelineKey,
      stages.filter((_, stageIndex) => stageIndex !== index),
    );
  };

  const reorderStages = (
    pipelineKey: string,
    items: SortableStage[],
  ) => {
    commitStages(
      pipelineKey,
      items.map(({ id: _id, ...stage }) => stage),
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>CRM pipelines</CardTitle>
          <CardDescription>
            Default sales pipelines and stages provisioned when this snapshot is
            applied to a business.
          </CardDescription>
        </div>
        {canManage ? (
          <Button type="button" size="sm" onClick={addPipeline}>
            <Plus className="mr-2 size-4" />
            Add pipeline
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {pipelines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pipelines configured.</p>
        ) : (
          pipelines.map((pipeline) => {
            const sortableStages = toSortableStages(
              pipeline.sourceKey,
              pipeline.stages ?? [],
            );

            return (
              <div key={pipeline.sourceKey} className="rounded-md border p-4 space-y-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Input
                      value={pipeline.name}
                      disabled={!canManage}
                      onChange={(e) =>
                        updatePipeline(pipeline.sourceKey, { name: e.target.value })
                      }
                      className="min-w-0 flex-1 font-medium"
                    />
                    {canManage ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => addStage(pipeline.sourceKey)}
                        >
                          <Plus className="mr-2 size-4" />
                          Add stage
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => removePipeline(pipeline.sourceKey)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                  <SortableList
                    items={sortableStages}
                    disabled={!canManage}
                    onReorder={(items) => reorderStages(pipeline.sourceKey, items)}
                    renderItem={(stage) => (
                      <div className="flex items-center gap-2">
                        <Input
                          value={stage.name}
                          disabled={!canManage}
                          onChange={(e) =>
                            updateStage(pipeline.sourceKey, stage.id, {
                              name: e.target.value,
                            })
                          }
                          className="min-w-0 flex-1"
                          placeholder="Stage name"
                        />
                        <SearchableSelect
                          items={STAGE_TYPE_OPTIONS}
                          value={stage.type ?? "OPEN"}
                          onValueChange={(type) =>
                            type &&
                            updateStage(pipeline.sourceKey, stage.id, {
                              type: type as SnapshotPipelineStage["type"],
                            })
                          }
                          disabled={!canManage}
                          triggerClassName="w-[140px] shrink-0"
                        />
                        {canManage ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => removeStage(pipeline.sourceKey, stage.id)}
                            aria-label="Remove stage"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    )}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
