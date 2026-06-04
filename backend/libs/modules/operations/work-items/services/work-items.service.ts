import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, WorkItemStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { ContactRepository } from '@app/modules/crm/contacts/repositories/contact.repository';
import { LeadRepository } from '@app/modules/crm/leads/repositories/lead.repository';
import { BusinessMembershipRepository } from '@app/modules/platform/membership/repositories/business-membership.repository';
import { ServiceRepository } from '@app/modules/crm/services/repositories/service.repository';
import { CreateWorkItemDto } from '../dto/create-work-item.dto';
import { ListWorkItemsQueryDto } from '../dto/list-work-items-query.dto';
import { UpdateWorkItemDto } from '../dto/update-work-item.dto';
import { WorkItemResponseDto } from '../dto/work-item-response.dto';
import { toWorkItemResponse } from '../mappers/work-item.mapper';
import { WorkItemRepository } from '../repositories/work-item.repository';

@Injectable()
export class WorkItemsService {
  constructor(
    private readonly workItemRepository: WorkItemRepository,
    private readonly contactRepository: ContactRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly leadRepository: LeadRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(
    businessId: string,
    dto: CreateWorkItemDto,
    actor: RequestUser,
  ): Promise<WorkItemResponseDto> {
    await this.assertContact(businessId, dto.contactId);

    if (dto.serviceId) {
      await this.assertService(businessId, dto.serviceId);
    }

    if (dto.leadId) {
      await this.assertLead(businessId, dto.leadId);
    }

    if (dto.assignedToId) {
      await this.assertAssignee(businessId, dto.assignedToId);
    }

    const workItem = await this.workItemRepository.create(
      businessId,
      {
        contactId: dto.contactId,
        serviceId: dto.serviceId ?? null,
        leadId: dto.leadId ?? null,
        title: dto.title.trim(),
        type: dto.type?.trim() || null,
        status: dto.status ?? WorkItemStatus.DRAFT,
        description: dto.description?.trim() || null,
        scheduledAt: this.parseDate(dto.scheduledAt),
        startedAt: this.parseDate(dto.startedAt),
        completedAt: this.parseDate(dto.completedAt),
        amount:
          dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : null,
        assignedToId: dto.assignedToId ?? null,
      },
      actor.id,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'work_item.created',
      entityType: 'WorkItem',
      entityId: workItem.id,
    });

    return toWorkItemResponse(workItem);
  }

  async list(
    businessId: string,
    query: ListWorkItemsQueryDto,
  ): Promise<{
    items: WorkItemResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.workItemRepository.findMany(
      businessId,
      {
        skip,
        take,
        search: query.search?.trim() || undefined,
        status: query.status,
        serviceId: query.serviceId,
        contactId: query.contactId,
        assignedToId: query.assignedToId,
        scheduledFrom: this.parseDate(query.scheduledFrom) ?? undefined,
        scheduledTo: this.parseDate(query.scheduledTo) ?? undefined,
      },
    );

    return {
      items: items.map(toWorkItemResponse),
      meta: { total, page, limit },
    };
  }

  async getById(
    businessId: string,
    id: string,
  ): Promise<WorkItemResponseDto> {
    const workItem = await this.workItemRepository.findById(businessId, id);
    if (!workItem) {
      throw new AppException(
        ErrorCode.WORK_ITEM_NOT_FOUND,
        'Work item not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toWorkItemResponse(workItem);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateWorkItemDto,
    actor: RequestUser,
  ): Promise<WorkItemResponseDto> {
    const existing = await this.workItemRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.WORK_ITEM_NOT_FOUND,
        'Work item not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.contactId !== undefined) {
      await this.assertContact(businessId, dto.contactId);
    }

    if (dto.serviceId) {
      await this.assertService(businessId, dto.serviceId);
    }

    if (dto.leadId) {
      await this.assertLead(businessId, dto.leadId);
    }

    if (dto.assignedToId) {
      await this.assertAssignee(businessId, dto.assignedToId);
    }

    const data: Prisma.WorkItemUpdateInput = {};

    if (dto.contactId !== undefined) {
      data.contact = { connect: { id: dto.contactId } };
    }
    if (dto.serviceId !== undefined) {
      data.service =
        dto.serviceId === null
          ? { disconnect: true }
          : { connect: { id: dto.serviceId } };
    }
    if (dto.leadId !== undefined) {
      data.lead =
        dto.leadId === null
          ? { disconnect: true }
          : { connect: { id: dto.leadId } };
    }
    if (dto.title !== undefined) {
      data.title = dto.title.trim();
    }
    if (dto.type !== undefined) {
      data.type = dto.type?.trim() || null;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.scheduledAt !== undefined) {
      data.scheduledAt =
        dto.scheduledAt === null ? null : this.parseDate(dto.scheduledAt);
    }
    if (dto.startedAt !== undefined) {
      data.startedAt =
        dto.startedAt === null ? null : this.parseDate(dto.startedAt);
    }
    if (dto.completedAt !== undefined) {
      data.completedAt =
        dto.completedAt === null ? null : this.parseDate(dto.completedAt);
    }
    if (dto.amount !== undefined) {
      data.amount =
        dto.amount === null || dto.amount === undefined
          ? null
          : new Prisma.Decimal(dto.amount);
    }
    if (dto.assignedToId !== undefined) {
      data.assignedTo =
        dto.assignedToId === null
          ? { disconnect: true }
          : { connect: { id: dto.assignedToId } };
    }
    const workItem = await this.workItemRepository.update(
      businessId,
      id,
      data,
    );
    if (!workItem) {
      throw new AppException(
        ErrorCode.WORK_ITEM_NOT_FOUND,
        'Work item not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'work_item.updated',
      entityType: 'WorkItem',
      entityId: id,
      metadata: { ...dto },
    });

    if (dto.status !== undefined && dto.status !== existing.status) {
      await this.auditService.log({
        actorUserId: actor.id,
        businessId,
        action: 'work_item.status_changed',
        entityType: 'WorkItem',
        entityId: id,
        metadata: { from: existing.status, to: dto.status },
      });
    }

    return toWorkItemResponse(workItem);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<WorkItemResponseDto> {
    const existing = await this.workItemRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.WORK_ITEM_NOT_FOUND,
        'Work item not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.workItemRepository.softDelete(businessId, id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'work_item.deleted',
      entityType: 'WorkItem',
      entityId: id,
    });

    return toWorkItemResponse(existing);
  }

  private parseDate(value?: string): Date | null {
    if (!value) {
      return null;
    }
    return new Date(value);
  }

  private async assertContact(
    businessId: string,
    contactId: string,
  ): Promise<void> {
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

  private async assertLead(businessId: string, leadId: string): Promise<void> {
    const lead = await this.leadRepository.findById(businessId, leadId);
    if (!lead) {
      throw new AppException(
        ErrorCode.LEAD_NOT_FOUND,
        'Lead not found',
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
}
