import type { EditablePipelineStage } from "@/features/pipelines/components/pipeline-stages-editor";
import {
  createPipelineStage,
  deletePipelineStage,
  getPipeline,
  reorderPipelineStages,
  updatePipeline,
  updatePipelineStage,
} from "@/features/pipelines/api/pipelines.api";
import type { Pipeline, PipelineStage } from "@/features/pipelines/types";

export async function savePipelineStages(
  pipelineId: string,
  orderedStages: EditablePipelineStage[],
  originalStages: PipelineStage[],
): Promise<void> {
  const keptServerIds = new Set(
    orderedStages.filter((s) => s.serverId).map((s) => s.serverId!),
  );
  const removedIds = originalStages
    .map((s) => s.id)
    .filter((id) => !keptServerIds.has(id));

  for (const stageId of removedIds) {
    await deletePipelineStage(pipelineId, stageId);
  }

  const idMap = new Map<string, string>();

  for (const stage of orderedStages.filter((s) => s.isNew)) {
    const name = stage.name.trim();
    const created = await createPipelineStage(pipelineId, {
      name,
      type: stage.type ?? "OPEN",
    });
    idMap.set(stage.clientId, created.id);
  }

  for (const stage of orderedStages.filter((s) => !s.isNew && s.serverId)) {
    const original = originalStages.find((o) => o.id === stage.serverId);
    if (!original) continue;

    const name = stage.name.trim();
    const type = stage.type ?? null;
    const nameChanged = original.name !== name;
    const typeChanged = (original.type ?? null) !== type;

    if (stage.serverId && (nameChanged || typeChanged)) {
      await updatePipelineStage(pipelineId, stage.serverId, {
        ...(nameChanged ? { name } : {}),
        ...(typeChanged ? { type: type ?? undefined } : {}),
      });
    }
  }

  const stageIds = orderedStages.map((s) =>
    s.isNew ? idMap.get(s.clientId)! : s.serverId!,
  );

  const originalOrder = [...originalStages]
    .sort((a, b) => a.position - b.position)
    .map((s) => s.id);

  const needsReorder =
    removedIds.length > 0 ||
    orderedStages.some((s) => s.isNew) ||
    stageIds.length !== originalOrder.length ||
    stageIds.some((id, i) => id !== originalOrder[i]);

  if (needsReorder) {
    await reorderPipelineStages(pipelineId, stageIds);
  }
}

export async function savePipelineWithStages(
  pipeline: Pipeline,
  pipelineName: string,
  orderedStages: EditablePipelineStage[],
): Promise<Pipeline> {
  await updatePipeline(pipeline.id, { name: pipelineName.trim() });
  await savePipelineStages(pipeline.id, orderedStages, pipeline.stages);
  return getPipeline(pipeline.id);
}

export { deletePipeline } from "@/features/pipelines/api/pipelines.api";
