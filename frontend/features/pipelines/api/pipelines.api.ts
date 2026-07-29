import { api } from "@/lib/api/client";
import type { Pipeline, PipelineStage } from "@/features/pipelines/types";

const DEFAULT_API_BASE = "pipelines";

function path(apiBase: string, ...segments: string[]) {
  return [apiBase, ...segments].filter(Boolean).join("/");
}

export function formatPipelineTableDate(
  iso: string | null | undefined,
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getPipelineStageCount(pipeline: Pipeline): number {
  return pipeline.stages?.length ?? 0;
}

export function pipelineDefaultLabel(pipeline: Pipeline): string {
  return pipeline.isDefault ? "Default" : "Custom";
}

export function listPipelines(apiBase: string = DEFAULT_API_BASE) {
  return api.get<Pipeline[]>(apiBase);
}

export function getPipeline(id: string, apiBase: string = DEFAULT_API_BASE) {
  return api.get<Pipeline>(path(apiBase, id));
}

export function createPipeline(
  body: Record<string, unknown>,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.post<Pipeline>(apiBase, body);
}

export function updatePipeline(
  id: string,
  body: Record<string, unknown>,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.patch<Pipeline>(path(apiBase, id), body);
}

export function deletePipeline(
  id: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.delete<void>(`${path(apiBase, id)}?confirm=true`);
}

export function createPipelineStage(
  pipelineId: string,
  body: Record<string, unknown>,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.post<PipelineStage>(path(apiBase, pipelineId, "stages"), body);
}

export function updatePipelineStage(
  pipelineId: string,
  stageId: string,
  body: Record<string, unknown>,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.patch<PipelineStage>(
    path(apiBase, pipelineId, "stages", stageId),
    body,
  );
}

export function deletePipelineStage(
  pipelineId: string,
  stageId: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.delete<void>(
    `${path(apiBase, pipelineId, "stages", stageId)}?confirm=true`,
  );
}

export function reorderPipelineStages(
  pipelineId: string,
  stageIds: string[],
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.patch<PipelineStage[]>(
    path(apiBase, pipelineId, "stages", "reorder"),
    { stageIds },
  );
}

export type LifecycleBoardCard = {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  lifecycleStage: string;
  lifecyclePipelineStageId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type LifecycleBoardResponse = {
  pipeline: {
    id: string;
    name: string;
    stages: Array<{
      id: string;
      name: string;
      position: number;
      type: string | null;
      mapsToLifecycleStage: string | null;
    }>;
  };
  items: LifecycleBoardCard[];
};

export function getLifecycleBoard(
  pipelineId: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.get<LifecycleBoardResponse>(path(apiBase, pipelineId, "board"));
}

export function moveLifecycleBoardCard(
  pipelineId: string,
  businessId: string,
  stageId: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.patch<LifecycleBoardCard>(
    path(apiBase, pipelineId, "board", businessId, "stage"),
    { stageId },
  );
}
