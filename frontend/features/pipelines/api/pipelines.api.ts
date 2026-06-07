import { api } from "@/lib/api/client";
import type { Pipeline, PipelineStage } from "@/features/pipelines/types";

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

export function listPipelines() {
  return api.get<Pipeline[]>("pipelines");
}

export function getPipeline(id: string) {
  return api.get<Pipeline>(`pipelines/${id}`);
}

export function createPipeline(body: Record<string, unknown>) {
  return api.post<Pipeline>("pipelines", body);
}

export function updatePipeline(id: string, body: Record<string, unknown>) {
  return api.patch<Pipeline>(`pipelines/${id}`, body);
}

export function deletePipeline(id: string) {
  return api.delete<void>(`pipelines/${id}?confirm=true`);
}

export function createPipelineStage(
  pipelineId: string,
  body: Record<string, unknown>,
) {
  return api.post<PipelineStage>(`pipelines/${pipelineId}/stages`, body);
}

export function updatePipelineStage(
  pipelineId: string,
  stageId: string,
  body: Record<string, unknown>,
) {
  return api.patch<PipelineStage>(
    `pipelines/${pipelineId}/stages/${stageId}`,
    body,
  );
}

export function deletePipelineStage(pipelineId: string, stageId: string) {
  return api.delete<void>(
    `pipelines/${pipelineId}/stages/${stageId}?confirm=true`,
  );
}

export function reorderPipelineStages(
  pipelineId: string,
  stageIds: string[],
) {
  return api.patch<PipelineStage[]>(
    `pipelines/${pipelineId}/stages/reorder`,
    { stageIds },
  );
}
