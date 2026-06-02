import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { RequestUser } from '../../../common/decorators/current-user.decorator';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/exceptions/error-code.enum';
import { htmlToPlainText } from '../../../common/utils/html-text.util';
import { getPaginationParams } from '../../../common/utils/pagination.util';
import { AuditService } from '../../audit/services/audit.service';
import { ContactRepository } from '../../contacts/repositories/contact.repository';
import { LeadRepository } from '../../leads/repositories/lead.repository';
import { BusinessMembershipRepository } from '../../membership/repositories/business-membership.repository';
import { CreateTaskDto } from '../dto/create-task.dto';
import { ListTasksQueryDto } from '../dto/list-tasks-query.dto';
import { TaskResponseDto } from '../dto/task-response.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { toTaskResponse } from '../mappers/task.mapper';
import { TaskRepository } from '../repositories/task.repository';

@Injectable()
export class TasksService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly contactRepository: ContactRepository,
    private readonly leadRepository: LeadRepository,
    private readonly membershipRepository: BusinessMembershipRepository,
    private readonly auditService: AuditService,
  ) {}

  async create(
    businessId: string,
    dto: CreateTaskDto,
    actor: RequestUser,
  ): Promise<TaskResponseDto> {
    this.assertHasLink(dto.contactId, dto.leadId);
    if (dto.contactId) {
      await this.assertContact(businessId, dto.contactId);
    }
    if (dto.leadId) {
      await this.assertLead(businessId, dto.leadId);
    }
    if (dto.assignedToId) {
      await this.assertAssignee(businessId, dto.assignedToId);
    }

    const description = dto.description ?? '';
    const task = await this.taskRepository.create(
      businessId,
      {
        contactId: dto.contactId ?? null,
        leadId: dto.leadId ?? null,
        title: dto.title.trim(),
        description,
        descriptionText: this.toDescriptionText(description),
        dueAt: new Date(dto.dueAt),
        status: dto.status,
        priority: dto.priority ?? null,
        assignedToId: dto.assignedToId ?? null,
      },
      actor.id,
    );

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'task.created',
      entityType: 'Task',
      entityId: task.id,
    });

    return toTaskResponse(task);
  }

  async list(
    businessId: string,
    query: ListTasksQueryDto,
  ): Promise<{
    items: TaskResponseDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { page, limit, skip, take } = getPaginationParams(query);
    const { items, total } = await this.taskRepository.findMany(businessId, {
      skip,
      take,
      search: query.search?.trim() || undefined,
      contactId: query.contactId,
      leadId: query.leadId,
      assignedToId: query.assignedToId,
      status: query.status,
      priority: query.priority,
      dueFrom: query.dueFrom ? new Date(query.dueFrom) : undefined,
      dueTo: query.dueTo ? new Date(query.dueTo) : undefined,
    });

    return {
      items: items.map(toTaskResponse),
      meta: { total, page, limit },
    };
  }

  async getById(businessId: string, id: string): Promise<TaskResponseDto> {
    const task = await this.taskRepository.findById(businessId, id);
    if (!task) {
      throw new AppException(
        ErrorCode.TASK_NOT_FOUND,
        'Task not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toTaskResponse(task);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateTaskDto,
    actor: RequestUser,
  ): Promise<TaskResponseDto> {
    const existing = await this.taskRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.TASK_NOT_FOUND,
        'Task not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const nextContactId =
      dto.contactId !== undefined ? dto.contactId : existing.contactId;
    const nextLeadId =
      dto.leadId !== undefined ? dto.leadId : existing.leadId;
    this.assertHasLink(nextContactId, nextLeadId);

    if (dto.contactId) {
      await this.assertContact(businessId, dto.contactId);
    }
    if (dto.leadId) {
      await this.assertLead(businessId, dto.leadId);
    }
    if (dto.assignedToId) {
      await this.assertAssignee(businessId, dto.assignedToId);
    }

    const data: Prisma.TaskUpdateInput = {};

    if (dto.contactId !== undefined) {
      data.contact =
        dto.contactId === null
          ? { disconnect: true }
          : { connect: { id: dto.contactId } };
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
    if (dto.description !== undefined) {
      data.description = dto.description;
      data.descriptionText = this.toDescriptionText(dto.description);
    }
    if (dto.dueAt !== undefined) {
      data.dueAt = new Date(dto.dueAt);
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === TaskStatus.COMPLETED && !existing.completedAt) {
        data.completedAt = new Date();
      } else if (dto.status !== TaskStatus.COMPLETED) {
        data.completedAt = null;
      }
    }
    if (dto.priority !== undefined) {
      data.priority = dto.priority;
    }
    if (dto.assignedToId !== undefined) {
      data.assignedTo =
        dto.assignedToId === null
          ? { disconnect: true }
          : { connect: { id: dto.assignedToId } };
    }

    const task = await this.taskRepository.update(businessId, id, data);
    if (!task) {
      throw new AppException(
        ErrorCode.TASK_NOT_FOUND,
        'Task not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'task.updated',
      entityType: 'Task',
      entityId: id,
    });

    return toTaskResponse(task);
  }

  async complete(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<TaskResponseDto> {
    const existing = await this.taskRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.TASK_NOT_FOUND,
        'Task not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const task = await this.taskRepository.update(businessId, id, {
      status: TaskStatus.COMPLETED,
      completedAt: new Date(),
    });
    if (!task) {
      throw new AppException(
        ErrorCode.TASK_NOT_FOUND,
        'Task not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'task.completed',
      entityType: 'Task',
      entityId: id,
    });

    return toTaskResponse(task);
  }

  async reopen(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<TaskResponseDto> {
    const existing = await this.taskRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.TASK_NOT_FOUND,
        'Task not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const task = await this.taskRepository.update(businessId, id, {
      status: TaskStatus.TODO,
      completedAt: null,
    });
    if (!task) {
      throw new AppException(
        ErrorCode.TASK_NOT_FOUND,
        'Task not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'task.reopened',
      entityType: 'Task',
      entityId: id,
    });

    return toTaskResponse(task);
  }

  async remove(
    businessId: string,
    id: string,
    actor: RequestUser,
  ): Promise<TaskResponseDto> {
    const existing = await this.taskRepository.findById(businessId, id);
    if (!existing) {
      throw new AppException(
        ErrorCode.TASK_NOT_FOUND,
        'Task not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.taskRepository.softDelete(businessId, id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'task.deleted',
      entityType: 'Task',
      entityId: id,
    });

    return toTaskResponse(existing);
  }

  private toDescriptionText(description: string): string | null {
    const text = htmlToPlainText(description);
    return text || null;
  }

  private assertHasLink(
    contactId?: string | null,
    leadId?: string | null,
  ): void {
    if (!contactId && !leadId) {
      throw new AppException(
        ErrorCode.LINK_REQUIRED,
        'Either contactId or leadId must be provided',
        HttpStatus.BAD_REQUEST,
      );
    }
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
