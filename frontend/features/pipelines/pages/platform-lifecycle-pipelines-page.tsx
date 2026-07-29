"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createPipeline,
  createPipelineStage,
  getLifecycleBoard,
  listPipelines,
  moveLifecycleBoardCard,
  type LifecycleBoardCard,
} from "@/features/pipelines/api/pipelines.api";
import { usePipelinesHost } from "@/features/pipelines/pipelines-host-context";
import { pipelineSelectOptions } from "@/features/pipelines/utils/select-options";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils";

/** Default campaign stages with lifecycle mapping for ops funnels. */
const DEFAULT_CAMPAIGN_STAGES = [
  { name: "New lead", mapsToLifecycleStage: "LEAD" as const },
  { name: "Contacted", mapsToLifecycleStage: "CONTACTED" as const },
  { name: "Trial", mapsToLifecycleStage: "TRIAL" as const },
  { name: "Paid", mapsToLifecycleStage: "ACTIVE" as const },
];

function lifecycleBadgeVariant(
  stage: string,
): "default" | "secondary" | "outline" | "destructive" {
  if (stage === "ACTIVE") return "default";
  if (stage === "TRIAL") return "secondary";
  if (stage === "CHURNED") return "destructive";
  return "outline";
}

export function PlatformLifecyclePipelinesPage() {
  const { apiBase } = usePipelinesHost();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: pipelines, isLoading: pipelinesLoading } = useQuery({
    queryKey: queryKeys.pipelines.list(apiBase),
    queryFn: () => listPipelines(apiBase),
  });

  const selectedPipeline = useMemo(() => {
    if (!pipelines?.length) return null;
    if (selectedId) {
      return pipelines.find((p) => p.id === selectedId) ?? pipelines[0];
    }
    return pipelines[0];
  }, [pipelines, selectedId]);

  const pipelineId = selectedPipeline?.id ?? "";

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: queryKeys.pipelines.lifecycleBoard(apiBase, pipelineId),
    queryFn: () => getLifecycleBoard(pipelineId, apiBase),
    enabled: !!pipelineId,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const pipeline = await createPipeline({ name }, apiBase);
      for (const [index, stage] of DEFAULT_CAMPAIGN_STAGES.entries()) {
        await createPipelineStage(
          pipeline.id,
          {
            name: stage.name,
            position: index + 1,
            type: stage.mapsToLifecycleStage === "ACTIVE" ? "WON" : "OPEN",
            mapsToLifecycleStage: stage.mapsToLifecycleStage,
          },
          apiBase,
        );
      }
      return pipeline;
    },
    onSuccess: async (pipeline) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.pipelines.list(apiBase),
      });
      setSelectedId(pipeline.id);
      setCreateOpen(false);
      setNewName("");
      toast.success("Pipeline created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveMutation = useMutation({
    mutationFn: ({
      businessId,
      stageId,
    }: {
      businessId: string;
      stageId: string;
    }) => moveLifecycleBoardCard(pipelineId, businessId, stageId, apiBase),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.pipelines.lifecycleBoard(apiBase, pipelineId),
      });
      toast.success("Business moved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stages = useMemo(() => {
    const list = board?.pipeline.stages ?? selectedPipeline?.stages ?? [];
    return [...list].sort((a, b) => a.position - b.position);
  }, [board?.pipeline.stages, selectedPipeline?.stages]);

  const cardsByStage = useMemo(() => {
    const map = new Map<string, LifecycleBoardCard[]>();
    for (const stage of stages) map.set(stage.id, []);
    for (const card of board?.items ?? []) {
      const key = card.lifecyclePipelineStageId ?? stages[0]?.id;
      if (!key) continue;
      const bucket = map.get(key) ?? [];
      bucket.push(card);
      map.set(key, bucket);
    }
    return map;
  }, [board?.items, stages]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Pipeline name is required");
      return;
    }
    createMutation.mutate(name);
  };

  if (pipelinesLoading) {
    return <Skeleton className="min-h-[20rem] w-full" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipelines"
        description="Campaign funnels on CodeSol Ops. Cards are real Business rows (LEAD → ACTIVE)."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            New pipeline
          </Button>
        }
      />

      {!pipelines?.length ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No campaign pipelines yet. Create one (e.g. “Facebook Campaign”) to
            place businesses from form automations.
          </p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Create first pipeline
          </Button>
        </div>
      ) : (
        <>
          <div className="max-w-sm">
            <SearchableSelect
              value={selectedPipeline?.id ?? null}
              onValueChange={setSelectedId}
              items={pipelineSelectOptions(pipelines)}
              placeholder="Select pipeline"
            />
          </div>

          {boardLoading ? (
            <Skeleton className="min-h-[16rem] w-full" />
          ) : stages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              This pipeline has no stages yet. Create a new pipeline (with
              default stages), or add stages via the API / settings.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {stages.map((stage) => {
                const cards = cardsByStage.get(stage.id) ?? [];
                return (
                  <div
                    key={stage.id}
                    className="w-72 shrink-0 rounded-lg border bg-muted/20 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{stage.name}</p>
                        {"mapsToLifecycleStage" in stage &&
                        stage.mapsToLifecycleStage ? (
                          <p className="text-xs text-muted-foreground">
                            → {String(stage.mapsToLifecycleStage)}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant="outline">{cards.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {cards.map((card) => (
                        <div
                          key={card.id}
                          className={cn(
                            "rounded-md border bg-background p-3 shadow-sm",
                          )}
                        >
                          <p className="text-sm font-medium">{card.name}</p>
                          {card.email ? (
                            <p className="text-xs text-muted-foreground">
                              {card.email}
                            </p>
                          ) : null}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant={lifecycleBadgeVariant(
                                card.lifecycleStage,
                              )}
                            >
                              {card.lifecycleStage}
                            </Badge>
                          </div>
                          <div className="mt-2">
                            <label className="text-[11px] text-muted-foreground">
                              Move to
                            </label>
                            <select
                              className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-xs"
                              value={card.lifecyclePipelineStageId ?? ""}
                              disabled={moveMutation.isPending}
                              onChange={(e) => {
                                const stageId = e.target.value;
                                if (
                                  stageId &&
                                  stageId !== card.lifecyclePipelineStageId
                                ) {
                                  moveMutation.mutate({
                                    businessId: card.id,
                                    stageId,
                                  });
                                }
                              }}
                            >
                              {stages.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                      {cards.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No businesses in this stage.
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setNewName("");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New campaign pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="pipeline-name">Name</Label>
              <Input
                id="pipeline-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Facebook Campaign"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Creates stages: New lead → Contacted → Trial → Paid (mapped to
              LEAD / CONTACTED / TRIAL / ACTIVE).
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!newName.trim() || createMutation.isPending}
              onClick={handleCreate}
            >
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
