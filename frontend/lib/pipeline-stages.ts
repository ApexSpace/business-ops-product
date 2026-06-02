import { apiClient } from "@/lib/api-client";
import type { EditablePipelineStage } from "@/components/pipelines/pipeline-stages-editor";
import type { Pipeline, PipelineStage, PipelineStageType } from "@/types/api";

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
    await apiClient(`pipelines/${pipelineId}/stages/${stageId}`, {
      method: "DELETE",
      searchParams: { confirm: true },
    });
  }

  const idMap = new Map<string, string>();

  for (const stage of orderedStages.filter((s) => s.isNew)) {
    const name = stage.name.trim();
    const created = await apiClient<PipelineStage>(
      `pipelines/${pipelineId}/stages`,
      {
        method: "POST",
        body: {
          name,
          type: stage.type ?? "OPEN",
        },
      },
    );
    idMap.set(stage.clientId, created.id);
  }

  for (const stage of orderedStages.filter((s) => !s.isNew && s.serverId)) {
    const original = originalStages.find((o) => o.id === stage.serverId);
    if (!original) continue;

    const name = stage.name.trim();
    const type = stage.type ?? null;
    const nameChanged = original.name !== name;
    const typeChanged = (original.type ?? null) !== type;

    if (nameChanged || typeChanged) {
      await apiClient<PipelineStage>(
        `pipelines/${pipelineId}/stages/${stage.serverId}`,
        {
          method: "PATCH",
          body: {
            ...(nameChanged ? { name } : {}),
            ...(typeChanged ? { type: type ?? undefined } : {}),
          },
        },
      );
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
    await apiClient<PipelineStage[]>(
      `pipelines/${pipelineId}/stages/reorder`,
      {
        method: "PATCH",
        body: { stageIds },
      },
    );
  }
}

export async function savePipelineWithStages(
  pipeline: Pipeline,
  pipelineName: string,
  orderedStages: EditablePipelineStage[],
): Promise<Pipeline> {
  await apiClient<Pipeline>(`pipelines/${pipeline.id}`, {
    method: "PATCH",
    body: { name: pipelineName.trim() },
  });

  await savePipelineStages(pipeline.id, orderedStages, pipeline.stages);

  return apiClient<Pipeline>(`pipelines/${pipeline.id}`);
}

export async function deletePipeline(pipelineId: string): Promise<void> {
  await apiClient(`pipelines/${pipelineId}`, {
    method: "DELETE",
    searchParams: { confirm: true },
  });
}
