import { Injectable } from '@nestjs/common';
import { Pipeline, Prisma } from '@prisma/client';
import {
  DEFAULT_PIPELINE_TEMPLATE,
  IndustryPipelineTemplate,
} from '@app/modules/crm/industries/types/industry.types';
import { parsePipelineTemplate } from '@app/modules/crm/industries/mappers/industry.mapper';

@Injectable()
export class PipelineProvisioningService {
  async provisionDefaultPipeline(
    tx: Prisma.TransactionClient,
    businessId: string,
    pipelineTemplate?: unknown,
  ): Promise<Pipeline> {
    const template: IndustryPipelineTemplate = pipelineTemplate
      ? parsePipelineTemplate(pipelineTemplate)
      : DEFAULT_PIPELINE_TEMPLATE;

    const pipeline = await tx.pipeline.create({
      data: {
        businessId,
        name: template.pipelineName,
        isDefault: true,
      },
    });

    for (let i = 0; i < template.stages.length; i++) {
      const stage = template.stages[i]!;
      await tx.pipelineStage.create({
        data: {
          businessId,
          pipelineId: pipeline.id,
          name: stage.name,
          position: i + 1,
          type: stage.type ?? null,
        },
      });
    }

    return pipeline;
  }
}
