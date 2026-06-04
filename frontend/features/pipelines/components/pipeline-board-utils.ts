import { parseBoardAmount } from "@/components/board";
import type { Lead } from "@/features/leads/types";
import type { PipelineStage } from "@/features/pipelines/types";

export function getLeadPipelineId(lead: Lead): string {
  return lead.pipelineId ?? lead.pipeline.id;
}

export function getLeadStageId(lead: Lead): string {
  return lead.pipelineStageId ?? lead.pipelineStage.id;
}

export function groupLeadsByStage(
  leads: Lead[],
  stages: PipelineStage[],
  pipelineId: string,
): Map<string, Lead[]> {
  const map = new Map<string, Lead[]>();
  for (const stage of stages) {
    map.set(stage.id, []);
  }
  for (const lead of leads) {
    if (getLeadPipelineId(lead) !== pipelineId) continue;
    const stageId = getLeadStageId(lead);
    const list = map.get(stageId);
    if (list) list.push(lead);
    else map.set(stageId, [lead]);
  }
  return map;
}

export function sumLeadColumnValue(leads: Lead[]): number {
  return leads.reduce((sum, lead) => sum + parseBoardAmount(lead.value), 0);
}
