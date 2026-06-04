import { HttpStatus, Injectable } from '@nestjs/common';
import { LeadStatus, PipelineStageType, Prisma } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { PipelineRepository } from '@app/modules/crm/pipelines/repositories/pipeline.repository';
import { PipelineStageRepository } from '@app/modules/crm/pipelines/repositories/pipeline-stage.repository';
import { ServiceRepository } from '@app/modules/crm/services/repositories/service.repository';
import { AssignLeadDto } from '../dto/assign-lead.dto';
import { CreateLeadFromContactDto } from '../dto/create-lead-from-contact.dto';
import { LeadResponseDto } from '../dto/lead-response.dto';
import { ListLeadsQueryDto } from '../dto/list-leads-query.dto';
import { MoveLeadStageDto } from '../dto/move-lead-stage.dto';
import { UpdateLeadDto } from '../dto/update-lead.dto';
import { toLeadResponse } from '../mappers/lead.mapper';
import { LeadRepository } from '../repositories/lead.repository';

@Injectable()
export class LeadsService {
  constructor(
    private readonly leadRepository: LeadRepository,
    private readonly contactRepository: ContactRepository,
    private readonly pipelineRepository: PipelineRepository,
    private readonly stageRepository: PipelineStageRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(
    businessId: string,
    query: ListLeadsQueryDto,
  ): Promise<{
    items: LeadResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.leadRepository.findMany(businessId, {
      skip,
      take,
      pipelineId: query.pipelineId,
      pipelineStageId: query.pipelineStageId,
      assignedToId: query.assignedToId,
      status: query.status,
      contactId: query.contactId,
    });
    return {
      items: items.map(toLeadResponse),
      meta: { total, page, limit },
    };
  }

  async getById(businessId: string, id: string): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findById(businessId, id);
    if (!lead) {
      throw new AppException(
        ErrorCode.LEAD_NOT_FOUND,
        'Lead not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toLeadResponse(lead);
  }

  async createFromContact(
    businessId: string,
    contactId: string,
    dto: CreateLeadFromContactDto,
    actor: RequestUser,
  ): Promise<LeadResponseDto> {
    const contact = await this.contactRepository.findById(
      businessId,
      contactId,
    );
    if (!contact) {
      throw new AppException(
        ErrorCode.CONTACT_NOT_FOUND,
        'Contact not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const { pipelineId, pipelineStageId } = await this.resolvePipelineAndStage(
      businessId,
      dto.pipelineId,
      dto.pipelineStageId,
    );

    if (dto.assignedToId) {
      await this.assertAssignee(businessId, dto.assignedToId);
    }

    if (dto.serviceId) {
      await this.assertService(businessId, dto.serviceId);
    }

    const title =
      dto.title?.trim() ||
      contact.displayName?.trim() ||
      [contact.firstName, contact.lastName].filter(Boolean).join(' ') ||
      contact.companyName?.trim() ||
      'Untitled lead';

    const leadData = {
      contactId,
      serviceId: dto.serviceId ?? null,
      pipelineId,
      pipelineStageId,
      assignedToId: dto.assignedToId ?? null,
      title,
      value: dto.value !== undefined ? new Prisma.Decimal(dto.value) : null,
      source: contact.source,
    };

    const existingLead = await this.leadRepository.findByContactId(
      businessId,
      contactId,
    );
    if (existingLead && !existingLead.deletedAt) {
      throw new AppException(
        ErrorCode.LEAD_ALREADY_EXISTS_FOR_CONTACT,
        'A lead already exists for this contact',
        HttpStatus.CONFLICT,
      );
    }

    try {
      const lead = existingLead?.deletedAt
        ? await this.leadRepository.reactivateFromContact(
            businessId,
            existingLead.id,
            leadData,
          )
        : await this.leadRepository.create(businessId, leadData, actor.id);

      await this.auditService.log({
        actorUserId: actor.id,
        businessId,
        action: existingLead?.deletedAt
          ? 'lead.reactivated_from_contact'
          : 'lead.created_from_contact',
        entityType: 'Lead',
        entityId: lead.id,
        metadata: { contactId, pipelineId, pipelineStageId },
      });

      return toLeadResponse(lead);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppException(
          ErrorCode.LEAD_ALREADY_EXISTS_FOR_CONTACT,
          'A lead already exists for this contact',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateLeadDto,
    actor: RequestUser,
  ): Promise<LeadResponseDto> {
    const existing = await this.leadRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.LEAD_NOT_FOUND,
        'Lead not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.assignedToId) {
      await this.assertAssignee(businessId, dto.assignedToId);
    }

    if (dto.serviceId) {
      await this.assertService(businessId, dto.serviceId);
    }

    const data: Prisma.LeadUpdateInput = {};
    if (dto.title !== undefined) {
      data.title = dto.title.trim() || null;
    }
    if (dto.value !== undefined) {
      data.value = new Prisma.Decimal(dto.value);
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.source !== undefined) {
      data.source = dto.source.trim() || null;
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes.trim() || null;
    }
    if (dto.assignedToId !== undefined) {
      data.assignedTo = dto.assignedToId
        ? { connect: { id: dto.assignedToId } }
        : { disconnect: true };
    }
    if (dto.serviceId !== undefined) {
      data.service = dto.serviceId
        ? { connect: { id: dto.serviceId } }
        : { disconnect: true };
    }

    const lead = await this.leadRepository.update(businessId, id, data);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'lead.updated',
      entityType: 'Lead',
      entityId: id,
      metadata: { ...dto },
    });

    return toLeadResponse(lead!);
  }

  async moveStage(
    businessId: string,
    id: string,
    dto: MoveLeadStageDto,
    actor: RequestUser,
  ): Promise<LeadResponseDto> {
    const existing = await this.leadRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.LEAD_NOT_FOUND,
        'Lead not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const stage = await this.stageRepository.findById(
      businessId,
      existing.pipelineId,
      dto.pipelineStageId,
    );
    if (!stage) {
      throw new AppException(
        ErrorCode.INVALID_STAGE_FOR_PIPELINE,
        'Stage does not belong to this lead pipeline',
        HttpStatus.BAD_REQUEST,
      );
    }

    const statusUpdate = this.statusFromStageType(stage.type);

    const lead = await this.leadRepository.update(businessId, id, {
      pipelineStage: { connect: { id: dto.pipelineStageId } },
      ...(statusUpdate ? { status: statusUpdate } : {}),
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'lead.moved',
      entityType: 'Lead',
      entityId: id,
      metadata: {
        fromStageId: existing.pipelineStageId,
        toStageId: dto.pipelineStageId,
      },
    });

    return toLeadResponse(lead!);
  }

  async assign(
    businessId: string,
    id: string,
    dto: AssignLeadDto,
    actor: RequestUser,
  ): Promise<LeadResponseDto> {
    await this.assertAssignee(businessId, dto.assignedToId);

    const lead = await this.leadRepository.update(businessId, id, {
      assignedTo: { connect: { id: dto.assignedToId } },
    });

    if (!lead) {
      throw new AppException(
        ErrorCode.LEAD_NOT_FOUND,
        'Lead not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'lead.assigned',
      entityType: 'Lead',
      entityId: id,
      metadata: { assignedToId: dto.assignedToId },
    });

    return toLeadResponse(lead);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<LeadResponseDto> {
    const existing = await this.leadRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.LEAD_NOT_FOUND,
        'Lead not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.leadRepository.softDelete(businessId, id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'lead.deleted',
      entityType: 'Lead',
      entityId: id,
    });

    return toLeadResponse(existing);
  }

  private async resolvePipelineAndStage(
    businessId: string,
    pipelineId?: string,
    pipelineStageId?: string,
  ): Promise<{ pipelineId: string; pipelineStageId: string }> {
    let resolvedPipelineId = pipelineId;
    let resolvedStageId = pipelineStageId;

    if (resolvedPipelineId) {
      const pipeline = await this.pipelineRepository.findById(
        businessId,
        resolvedPipelineId,
      );
      if (!pipeline) {
        throw new AppException(
          ErrorCode.PIPELINE_NOT_FOUND,
          'Pipeline not found',
          HttpStatus.NOT_FOUND,
        );
      }
    } else {
      const defaultPipeline =
        await this.pipelineRepository.findDefault(businessId);
      if (!defaultPipeline) {
        throw new AppException(
          ErrorCode.PIPELINE_NOT_FOUND,
          'No default pipeline found',
          HttpStatus.NOT_FOUND,
        );
      }
      resolvedPipelineId = defaultPipeline.id;
    }

    if (resolvedStageId) {
      const stage = await this.stageRepository.findById(
        businessId,
        resolvedPipelineId!,
        resolvedStageId,
      );
      if (!stage) {
        throw new AppException(
          ErrorCode.INVALID_STAGE_FOR_PIPELINE,
          'Stage does not belong to the selected pipeline',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      const firstStage = await this.stageRepository.findFirstByPosition(
        businessId,
        resolvedPipelineId!,
        1,
      );
      if (!firstStage) {
        throw new AppException(
          ErrorCode.PIPELINE_STAGE_NOT_FOUND,
          'Pipeline has no stages',
          HttpStatus.BAD_REQUEST,
        );
      }
      resolvedStageId = firstStage.id;
    }

    return {
      pipelineId: resolvedPipelineId!,
      pipelineStageId: resolvedStageId!,
    };
  }

  private async assertService(
    businessId: string,
    serviceId: string,
  ): Promise<void> {
    const service = await this.serviceRepository.findById(
      businessId,
      serviceId,
    );
    if (!service) {
      throw new AppException(
        ErrorCode.SERVICE_NOT_FOUND,
        'Service not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async assertAssignee(
    businessId: string,
    userId: string,
  ): Promise<void> {
    const membership =
      await this.membershipRepository.findActiveByUserAndBusiness(
        userId,
        businessId,
      );
    if (!membership) {
      throw new AppException(
        ErrorCode.ASSIGNEE_NOT_MEMBER,
        'Assignee is not an active member of this business',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private statusFromStageType(
    type: PipelineStageType | null,
  ): LeadStatus | undefined {
    if (type === PipelineStageType.WON) {
      return LeadStatus.WON;
    }
    if (type === PipelineStageType.LOST) {
      return LeadStatus.LOST;
    }
    return undefined;
  }
}
