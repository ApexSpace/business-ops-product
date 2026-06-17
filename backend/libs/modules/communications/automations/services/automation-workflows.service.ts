import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AutomationWorkflowRunStatus,
  AutomationWorkflowStatus,
  Prisma,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import {
  CreateAutomationWorkflowDto,
  ListAutomationWorkflowRunsQueryDto,
  ListAutomationWorkflowsQueryDto,
  UpdateAutomationWorkflowDto,
  UpdateAutomationWorkflowStatusDto,
} from '../dto/automation-workflow.dto';
import {
  parseWorkflowSettings,
  parseWorkflowSteps,
  parseWorkflowTriggerFilters,
  toAutomationWorkflowResponse,
  toAutomationWorkflowRunResponse,
} from '../mappers/automation-workflow.mapper';
import {
  AutomationWorkflowRepository,
  AutomationWorkflowRunRepository,
} from '../repositories/automation-workflow.repository';
import {
  assertValidTriggerKey,
  normalizeWorkflowSettings,
  validateTriggerFilters,
  validateWorkflowSteps,
} from '../utils/workflow-validation.util';

@Injectable()
export class AutomationWorkflowsService {
  constructor(
    private readonly workflowRepository: AutomationWorkflowRepository,
    private readonly runRepository: AutomationWorkflowRunRepository,
    private readonly auditService: AuditService,
  ) {}

  async list(businessId: string, query: ListAutomationWorkflowsQueryDto) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const [items, total] = await this.workflowRepository.findMany(businessId, {
      skip,
      take,
      search: query.search,
      status: query.status,
      triggerKey: query.triggerKey,
    });

    return {
      items: items.map(toAutomationWorkflowResponse),
      meta: { total, page, limit },
    };
  }

  async get(businessId: string, id: string) {
    const workflow = await this.requireWorkflow(businessId, id);
    return toAutomationWorkflowResponse(workflow);
  }

  async create(
    businessId: string,
    dto: CreateAutomationWorkflowDto,
    actor: RequestUser,
  ) {
    assertValidTriggerKey(dto.triggerKey);
    validateTriggerFilters(dto.triggerFilters);
    validateWorkflowSteps(dto.steps);

    const workflow = await this.workflowRepository.create({
      businessId,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      triggerKey: dto.triggerKey,
      triggerFilters: dto.triggerFilters ?? null,
      steps: dto.steps,
      settings: normalizeWorkflowSettings(dto.settings),
      createdById: actor.id,
      status: AutomationWorkflowStatus.DRAFT,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'automation.workflow.created',
      entityType: 'AutomationWorkflow',
      entityId: workflow.id,
      metadata: { triggerKey: workflow.triggerKey },
    });

    return toAutomationWorkflowResponse(workflow);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateAutomationWorkflowDto,
    actor: RequestUser,
  ) {
    await this.requireWorkflow(businessId, id);
    assertValidTriggerKey(dto.triggerKey);
    validateTriggerFilters(dto.triggerFilters);
    validateWorkflowSteps(dto.steps);

    const workflow = await this.workflowRepository.update(businessId, id, {
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      triggerKey: dto.triggerKey,
      triggerFilters: dto.triggerFilters as unknown as Prisma.InputJsonValue,
      steps: dto.steps as unknown as Prisma.InputJsonValue,
      settings: normalizeWorkflowSettings(dto.settings) as unknown as Prisma.InputJsonValue,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'automation.workflow.updated',
      entityType: 'AutomationWorkflow',
      entityId: workflow.id,
    });

    return toAutomationWorkflowResponse(workflow);
  }

  async updateStatus(
    businessId: string,
    id: string,
    dto: UpdateAutomationWorkflowStatusDto,
    actor: RequestUser,
  ) {
    const existing = await this.requireWorkflow(businessId, id);
    if (dto.status === AutomationWorkflowStatus.ACTIVE) {
      const steps = parseWorkflowSteps(existing.steps);
      if (steps.length === 0) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Workflow must have at least one step before activation',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const workflow = await this.workflowRepository.update(businessId, id, {
      status: dto.status,
    });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action:
        dto.status === AutomationWorkflowStatus.ACTIVE
          ? 'automation.workflow.activated'
          : dto.status === AutomationWorkflowStatus.INACTIVE
            ? 'automation.workflow.deactivated'
            : 'automation.workflow.updated',
      entityType: 'AutomationWorkflow',
      entityId: workflow.id,
      metadata: { status: dto.status },
    });

    return toAutomationWorkflowResponse(workflow);
  }

  async remove(businessId: string, id: string, actor: RequestUser) {
    await this.requireWorkflow(businessId, id);
    const result = await this.workflowRepository.softDelete(businessId, id);
    if (result.count === 0) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Workflow not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'automation.workflow.deleted',
      entityType: 'AutomationWorkflow',
      entityId: id,
    });

    return { success: true };
  }

  async listRuns(businessId: string, query: ListAutomationWorkflowRunsQueryDto) {
    const { page, limit, skip, take } = getPaginationParams(query);
    const [items, total] = await this.runRepository.findMany(businessId, {
      skip,
      take,
      workflowId: query.workflowId,
      contactId: query.contactId,
      status: query.status,
    });

    return {
      items: items.map(toAutomationWorkflowRunResponse),
      meta: { total, page, limit },
    };
  }

  async getRun(businessId: string, runId: string) {
    const run = await this.runRepository.findById(businessId, runId);
    if (!run) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Workflow run not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return toAutomationWorkflowRunResponse(run);
  }

  private async requireWorkflow(businessId: string, id: string) {
    const workflow = await this.workflowRepository.findById(businessId, id);
    if (!workflow) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Workflow not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return workflow;
  }
}
