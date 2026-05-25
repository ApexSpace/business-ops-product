import { HttpStatus, Injectable } from '@nestjs/common';
import { RequestUser } from '../../../common/decorators/current-user.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/exceptions/error-code.enum';
import { AuditService } from '../../audit/services/audit.service';
import { CreatePipelineStageDto } from '../dto/create-pipeline-stage.dto';
import { PipelineStageResponseDto } from '../dto/pipeline-stage-response.dto';
import { ReorderPipelineStagesDto } from '../dto/reorder-pipeline-stages.dto';
import { UpdatePipelineStageDto } from '../dto/update-pipeline-stage.dto';
import { toPipelineStageResponse } from '../mappers/pipeline.mapper';
import { PipelineStageRepository } from '../repositories/pipeline-stage.repository';
import { PipelineRepository } from '../repositories/pipeline.repository';

@Injectable()
export class PipelineStagesService {
  constructor(
    private readonly pipelineRepository: PipelineRepository,
    private readonly stageRepository: PipelineStageRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(
    businessId: string,
    pipelineId: string,
    dto: CreatePipelineStageDto,
    actor: RequestUser,
  ): Promise<PipelineStageResponseDto> {
    await this.assertPipelineExists(businessId, pipelineId);

    const name = dto.name.trim();
    let position: number;

    if (dto.position !== undefined) {
      position = dto.position;
      await this.stageRepository.shiftPositionsFrom(pipelineId, position, 1);
    } else {
      const max = await this.stageRepository.getMaxPosition(pipelineId);
      position = max + 1;
    }

    const stage = await this.stageRepository.create(businessId, pipelineId, {
      name,
      position,
      type: dto.type ?? null,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'pipeline_stage.created',
      entityType: 'PipelineStage',
      entityId: stage.id,
      metadata: { pipelineId, name },
    });

    return toPipelineStageResponse(stage);
  }

  async update(
    businessId: string,
    pipelineId: string,
    stageId: string,
    dto: UpdatePipelineStageDto,
    actor: RequestUser,
  ): Promise<PipelineStageResponseDto> {
    await this.assertPipelineExists(businessId, pipelineId);

    const stage = await this.stageRepository.update(
      businessId,
      pipelineId,
      stageId,
      {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
      },
    );

    if (!stage) {
      throw new AppException(
        ErrorCode.PIPELINE_STAGE_NOT_FOUND,
        'Pipeline stage not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'pipeline_stage.updated',
      entityType: 'PipelineStage',
      entityId: stageId,
      metadata: { ...dto },
    });

    return toPipelineStageResponse(stage);
  }

  async reorder(
    businessId: string,
    pipelineId: string,
    dto: ReorderPipelineStagesDto,
    actor: RequestUser,
  ): Promise<PipelineStageResponseDto[]> {
    await this.assertPipelineExists(businessId, pipelineId);

    const stages = await this.stageRepository.reorder(
      businessId,
      pipelineId,
      dto.stageIds,
    );

    if (stages.length === 0) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Invalid stage order: must include all stages for this pipeline',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'pipeline_stage.reordered',
      entityType: 'Pipeline',
      entityId: pipelineId,
      metadata: { stageIds: dto.stageIds },
    });

    return stages.map(toPipelineStageResponse);
  }

  async remove(
    businessId: string,
    pipelineId: string,
    stageId: string,
    actor: RequestUser,
  ): Promise<PipelineStageResponseDto> {
    await this.assertPipelineExists(businessId, pipelineId);

    const existing = await this.stageRepository.findById(
      businessId,
      pipelineId,
      stageId,
    );
    if (!existing) {
      throw new AppException(
        ErrorCode.PIPELINE_STAGE_NOT_FOUND,
        'Pipeline stage not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const leadCount = await this.stageRepository.countLeads(
      businessId,
      stageId,
    );
    if (leadCount > 0) {
      throw new AppException(
        ErrorCode.PIPELINE_STAGE_HAS_LEADS,
        'Cannot delete stage with active leads',
        HttpStatus.CONFLICT,
      );
    }

    const stages = await this.stageRepository.findByPipeline(
      businessId,
      pipelineId,
    );
    if (stages.length <= 1) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Cannot delete the only stage in a pipeline',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.stageRepository.delete(businessId, pipelineId, stageId);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'pipeline_stage.deleted',
      entityType: 'PipelineStage',
      entityId: stageId,
    });

    return toPipelineStageResponse(existing);
  }

  private async assertPipelineExists(
    businessId: string,
    pipelineId: string,
  ): Promise<void> {
    const pipeline = await this.pipelineRepository.findById(
      businessId,
      pipelineId,
    );
    if (!pipeline) {
      throw new AppException(
        ErrorCode.PIPELINE_NOT_FOUND,
        'Pipeline not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
