import { PipelineStageType } from '@prisma/client';
import { PipelineStageResponseDto } from '../dto/pipeline-stage-response.dto';
import { PipelineResponseDto } from '../dto/pipeline-response.dto';
import { PipelineWithStages } from '../repositories/pipeline.repository';

export function toPipelineStageResponse(stage: {
  id: string;
  pipelineId: string;
  name: string;
  position: number;
  type: PipelineStageType | null;
  createdAt: Date;
  updatedAt: Date;
}): PipelineStageResponseDto {
  return {
    id: stage.id,
    pipelineId: stage.pipelineId,
    name: stage.name,
    position: stage.position,
    type: stage.type,
    createdAt: stage.createdAt,
    updatedAt: stage.updatedAt,
  };
}

export function toPipelineResponse(
  pipeline: PipelineWithStages,
): PipelineResponseDto {
  return {
    id: pipeline.id,
    businessId: pipeline.businessId,
    name: pipeline.name,
    isDefault: pipeline.isDefault,
    stages: pipeline.stages.map(toPipelineStageResponse),
    createdAt: pipeline.createdAt,
    updatedAt: pipeline.updatedAt,
  };
}
