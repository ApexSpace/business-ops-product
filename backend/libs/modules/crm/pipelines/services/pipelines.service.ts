import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { CreatePipelineDto } from '../dto/create-pipeline.dto';
import { PipelineResponseDto } from '../dto/pipeline-response.dto';
import { UpdatePipelineDto } from '../dto/update-pipeline.dto';
import { toPipelineResponse } from '../mappers/pipeline.mapper';
import { PipelineRepository } from '../repositories/pipeline.repository';

@Injectable()
export class PipelinesService {
  constructor(
    private readonly pipelineRepository: PipelineRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(businessId: string): Promise<PipelineResponseDto[]> {
    const pipelines = await this.pipelineRepository.findMany(businessId);
    return pipelines.map(toPipelineResponse);
  }

  async getById(businessId: string, id: string): Promise<PipelineResponseDto> {
    const pipeline = await this.pipelineRepository.findById(businessId, id);
    if (!pipeline) {
      throw new AppException(
        ErrorCode.PIPELINE_NOT_FOUND,
        'Pipeline not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toPipelineResponse(pipeline);
  }

  async create(
    businessId: string,
    dto: CreatePipelineDto,
    actor: RequestUser,
  ): Promise<PipelineResponseDto> {
    const name = dto.name.trim();
    await this.assertNameAvailable(businessId, name);

    if (dto.isDefault) {
      await this.pipelineRepository.clearDefaultExcept(businessId);
    }

    const pipeline = await this.pipelineRepository.create(businessId, {
      name,
      isDefault: dto.isDefault ?? false,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'pipeline.created',
      entityType: 'Pipeline',
      entityId: pipeline.id,
      metadata: { name },
    });

    return toPipelineResponse(pipeline);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdatePipelineDto,
    actor: RequestUser,
  ): Promise<PipelineResponseDto> {
    const existing = await this.pipelineRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.PIPELINE_NOT_FOUND,
        'Pipeline not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.name) {
      await this.assertNameAvailable(businessId, dto.name.trim(), id);
    }

    if (dto.isDefault === true) {
      await this.pipelineRepository.clearDefaultExcept(businessId, id);
    }

    const data: Prisma.PipelineUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.isDefault !== undefined) {
      data.isDefault = dto.isDefault;
    }

    const pipeline = await this.pipelineRepository.update(businessId, id, data);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'pipeline.updated',
      entityType: 'Pipeline',
      entityId: id,
      metadata: { ...dto },
    });

    return toPipelineResponse(pipeline!);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<PipelineResponseDto> {
    const existing = await this.pipelineRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.PIPELINE_NOT_FOUND,
        'Pipeline not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const leadCount = await this.pipelineRepository.countLeads(businessId, id);
    if (leadCount > 0) {
      throw new AppException(
        ErrorCode.PIPELINE_HAS_LEADS,
        'Cannot delete pipeline with active leads',
        HttpStatus.CONFLICT,
      );
    }

    const pipelineCount =
      await this.pipelineRepository.countByBusiness(businessId);
    if (existing.isDefault && pipelineCount <= 1) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Cannot delete the only default pipeline',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.pipelineRepository.delete(businessId, id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'pipeline.deleted',
      entityType: 'Pipeline',
      entityId: id,
    });

    return toPipelineResponse(existing);
  }

  private async assertNameAvailable(
    businessId: string,
    name: string,
    excludeId?: string,
  ): Promise<void> {
    const existing = await this.pipelineRepository.findByName(
      businessId,
      name,
      excludeId,
    );
    if (existing) {
      throw new AppException(
        ErrorCode.PIPELINE_NAME_CONFLICT,
        'A pipeline with this name already exists',
        HttpStatus.CONFLICT,
      );
    }
  }
}
