import { Injectable, Logger } from '@nestjs/common';
import {
  AutomationWorkflowRunStatus,
  AutomationWorkflowRunStepStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { QueueService } from '@app/core/queue/queue.service';
import {
  parseWorkflowSettings,
  parseWorkflowSteps,
  parseWorkflowTriggerFilters,
} from '../mappers/automation-workflow.mapper';
import {
  AutomationWorkflowRepository,
  AutomationWorkflowRunRepository,
} from '../repositories/automation-workflow.repository';
import type { AutomationDomainEventPayload } from '../types/domain-event.types';
import type { AutomationRunContext } from '../types/workflow.types';
import {
  buildAutomationRunContext,
  resolveContactIdForEvent,
} from '../utils/automation-run-context.util';
import { evaluateWorkflowTriggerFilters } from '../utils/workflow-filter.util';

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowRepository: AutomationWorkflowRepository,
    private readonly runRepository: AutomationWorkflowRunRepository,
    private readonly queueService: QueueService,
  ) {}

  async handleDomainEvent(event: AutomationDomainEventPayload): Promise<void> {
    const workflows = await this.workflowRepository.findActiveByTrigger(
      event.businessId,
      event.triggerKey,
    );
    if (workflows.length === 0) {
      return;
    }

    const contactId = await resolveContactIdForEvent(this.prisma, event);

    for (const workflow of workflows) {
      const filters = parseWorkflowTriggerFilters(workflow.triggerFilters);
      if (!evaluateWorkflowTriggerFilters(filters, event.metadata)) {
        continue;
      }

      const settings = parseWorkflowSettings(workflow.settings);
      const steps = parseWorkflowSteps(workflow.steps);
      if (steps.length === 0) {
        continue;
      }

      const shouldEnroll = await this.shouldEnroll({
        businessId: event.businessId,
        workflowId: workflow.id,
        settings,
        subjectId: event.subjectId,
        contextEntityId: event.contextEntityId,
      });
      if (!shouldEnroll) {
        continue;
      }

      const run = await this.runRepository.create({
        businessId: event.businessId,
        workflowId: workflow.id,
        triggerKey: event.triggerKey,
        subjectId: event.subjectId,
        subjectType: event.subjectType,
        contextEntityId: event.contextEntityId ?? null,
        contextEntityType: event.contextEntityType ?? null,
        contactId: contactId ?? null,
        enrollmentReason: event.auditAction,
        metadata: event.metadata,
        steps: steps.map((step, index) => ({
          stepIndex: index,
          actionKey: step.actionKey,
          config: step.config,
        })),
      });

      this.logger.debug(
        `Enrolled workflow ${workflow.id} run ${run.id} for ${event.triggerKey}`,
      );

      await this.queueService.enqueueAutomationStep({
        businessId: event.businessId,
        runId: run.id,
        stepIndex: 0,
      });
    }
  }

  buildContextFromRun(run: {
    id: string;
    businessId: string;
    workflowId: string;
    triggerKey: string;
    subjectId: string;
    subjectType: string;
    contextEntityId: string | null;
    contextEntityType: string | null;
    contactId: string | null;
    metadata: unknown;
  }): AutomationRunContext {
    const metadata =
      run.metadata && typeof run.metadata === 'object'
        ? (run.metadata as Record<string, unknown>)
        : undefined;

    return buildAutomationRunContext({
      event: {
        triggerKey: run.triggerKey,
        businessId: run.businessId,
        subjectId: run.subjectId,
        subjectType: run.subjectType as AutomationDomainEventPayload['subjectType'],
        contextEntityId: run.contextEntityId ?? undefined,
        contextEntityType:
          run.contextEntityType as AutomationDomainEventPayload['contextEntityType'],
        metadata,
        auditAction: 'automation.run',
        auditEntityType: 'AutomationWorkflowRun',
        auditEntityId: run.id,
        occurredAt: new Date().toISOString(),
      },
      workflowId: run.workflowId,
      runId: run.id,
      contactId: run.contactId ?? undefined,
    });
  }

  private async shouldEnroll(params: {
    businessId: string;
    workflowId: string;
    settings: ReturnType<typeof parseWorkflowSettings>;
    subjectId: string;
    contextEntityId?: string;
  }): Promise<boolean> {
    const { settings, businessId, workflowId, subjectId, contextEntityId } =
      params;

    if (settings.runPolicy === 'every_time') {
      return true;
    }

    const existing = await this.runRepository.hasCompletedRun({
      businessId,
      workflowId,
      ...(settings.runPolicy === 'once_per_subject'
        ? { subjectId }
        : { contextEntityId: contextEntityId ?? subjectId }),
    });

    if (existing && !settings.allowReentry) {
      return false;
    }

    return true;
  }

  async markRunFailed(runId: string, message: string): Promise<void> {
    await this.runRepository.updateRun(runId, {
      status: AutomationWorkflowRunStatus.FAILED,
      failedAt: new Date(),
      errorMessage: message,
    });
  }

  async markRunCompleted(runId: string): Promise<void> {
    await this.runRepository.updateRun(runId, {
      status: AutomationWorkflowRunStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  async advanceToNextStep(
    runId: string,
    completedStepIndex: number,
    delayMs = 0,
  ): Promise<void> {
    const run = await this.runRepository.findRunById(runId);
    if (!run) {
      return;
    }

    const nextIndex = completedStepIndex + 1;
    const totalSteps = run.steps.length;

    if (nextIndex >= totalSteps) {
      await this.markRunCompleted(runId);
      return;
    }

    await this.runRepository.updateRun(runId, {
      currentStepIndex: nextIndex,
      status:
        delayMs > 0
          ? AutomationWorkflowRunStatus.WAITING
          : AutomationWorkflowRunStatus.RUNNING,
    });

    await this.queueService.enqueueAutomationStep(
      {
        businessId: run.businessId,
        runId,
        stepIndex: nextIndex,
      },
      delayMs > 0 ? { delay: delayMs } : undefined,
    );
  }

  async updateStepStatus(
    runId: string,
    stepIndex: number,
    status: AutomationWorkflowRunStepStatus,
    data?: {
      errorMessage?: string;
      output?: Record<string, unknown>;
      scheduledFor?: Date;
    },
  ): Promise<void> {
    const patch: Record<string, unknown> = { status };
    if (status === AutomationWorkflowRunStepStatus.RUNNING) {
      patch.startedAt = new Date();
    }
    if (
      status === AutomationWorkflowRunStepStatus.COMPLETED ||
      status === AutomationWorkflowRunStepStatus.FAILED ||
      status === AutomationWorkflowRunStepStatus.SKIPPED
    ) {
      patch.completedAt = new Date();
    }
    if (data?.errorMessage) patch.errorMessage = data.errorMessage;
    if (data?.output) patch.output = data.output;
    if (data?.scheduledFor) patch.scheduledFor = data.scheduledFor;

    await this.runRepository.updateStep(runId, stepIndex, patch);
  }
}
