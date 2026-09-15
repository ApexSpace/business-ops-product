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
import { msUntilAllowedTimeWindow } from '../utils/workflow-time-window.util';
import { EnrollmentFilterService } from './enrollment-filter.service';

const QUEUE_UNAVAILABLE_MESSAGE =
  'Automation step queue is unavailable (Redis not connected)';

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowRepository: AutomationWorkflowRepository,
    private readonly runRepository: AutomationWorkflowRunRepository,
    private readonly queueService: QueueService,
    private readonly enrollmentFilterService: EnrollmentFilterService,
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
      const passesFilters = await this.enrollmentFilterService.evaluate(
        filters,
        event,
        contactId ?? undefined,
      );
      if (!passesFilters) {
        this.logger.debug(
          `Skipped workflow ${workflow.id}: enrollment filters not met for ${event.triggerKey}`,
        );
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

      const enqueued = await this.enqueueStepOrFail(run.id, run.businessId, 0);
      if (!enqueued) {
        await this.markRunFailed(run.id, QUEUE_UNAVAILABLE_MESSAGE);
      }
    }
  }

  async cancelRunsOnContactResponse(
    event: AutomationDomainEventPayload,
  ): Promise<void> {
    const contactId = await resolveContactIdForEvent(this.prisma, event);
    if (!contactId) {
      return;
    }

    const runs = await this.runRepository.findActiveRunsForContact(
      event.businessId,
      contactId,
    );

    for (const run of runs) {
      const settings = parseWorkflowSettings(run.workflow.settings);
      if (!settings.stopOnResponse) {
        continue;
      }
      await this.runRepository.updateRun(run.id, {
        status: AutomationWorkflowRunStatus.CANCELLED,
        completedAt: new Date(),
        errorMessage: 'Cancelled: contact responded',
      });
      this.logger.debug(`Cancelled run ${run.id} due to contact response`);
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
        subjectType:
          run.subjectType as AutomationDomainEventPayload['subjectType'],
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
      const active = await this.runRepository.hasActiveRun({
        businessId,
        workflowId,
        subjectId,
        contextEntityId: contextEntityId ?? subjectId,
      });
      return !active;
    }

    const dedupeContextId = settings.allowMultipleContexts
      ? (contextEntityId ?? subjectId)
      : subjectId;

    if (settings.runPolicy === 'once_per_period') {
      const existing = await this.runRepository.hasCompletedRunSince({
        businessId,
        workflowId,
        subjectId,
        contextEntityId: dedupeContextId,
        since: new Date(
          Date.now() - settings.runPolicyPeriodDays * 24 * 60 * 60 * 1000,
        ),
      });
      if (existing && !settings.allowReentry) {
        return false;
      }
      return true;
    }

    const existing = await this.runRepository.hasCompletedRun({
      businessId,
      workflowId,
      ...(settings.runPolicy === 'once_per_subject'
        ? { subjectId }
        : { contextEntityId: dedupeContextId }),
    });

    if (existing && !settings.allowReentry) {
      return false;
    }

    const active = await this.runRepository.hasActiveRun({
      businessId,
      workflowId,
      subjectId,
      contextEntityId: dedupeContextId,
    });
    if (active) {
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

    const enqueued = await this.enqueueStepOrFail(
      runId,
      run.businessId,
      nextIndex,
      delayMs,
    );
    if (!enqueued) {
      await this.markRunFailed(runId, QUEUE_UNAVAILABLE_MESSAGE);
    }
  }

  async advanceToStepById(
    runId: string,
    stepId: string,
    completedStepIndex: number,
    delayMs = 0,
  ): Promise<void> {
    const run = await this.runRepository.findRunById(runId);
    if (!run) {
      return;
    }

    const workflowSteps = parseWorkflowSteps(run.workflow.steps);
    const nextIndex = workflowSteps.findIndex((step) => step.id === stepId);
    if (nextIndex < 0) {
      await this.markRunFailed(
        runId,
        `Branch target step not found: ${stepId}`,
      );
      return;
    }

    if (nextIndex <= completedStepIndex) {
      await this.markRunFailed(
        runId,
        `Branch target must be after step ${completedStepIndex}`,
      );
      return;
    }

    await this.runRepository.updateRun(runId, {
      currentStepIndex: nextIndex,
      status:
        delayMs > 0
          ? AutomationWorkflowRunStatus.WAITING
          : AutomationWorkflowRunStatus.RUNNING,
    });

    const enqueued = await this.enqueueStepOrFail(
      runId,
      run.businessId,
      nextIndex,
      delayMs,
    );
    if (!enqueued) {
      await this.markRunFailed(runId, QUEUE_UNAVAILABLE_MESSAGE);
    }
  }

  async reEnqueueStep(
    runId: string,
    stepIndex: number,
    delayMs = 0,
  ): Promise<void> {
    const run = await this.runRepository.findRunById(runId);
    if (!run) {
      return;
    }

    await this.runRepository.updateRun(runId, {
      currentStepIndex: stepIndex,
      status:
        delayMs > 0
          ? AutomationWorkflowRunStatus.WAITING
          : AutomationWorkflowRunStatus.RUNNING,
    });

    const enqueued = await this.enqueueStepOrFail(
      runId,
      run.businessId,
      stepIndex,
      delayMs,
    );
    if (!enqueued) {
      await this.markRunFailed(runId, QUEUE_UNAVAILABLE_MESSAGE);
    }
  }

  resolveTimeWindowDelay(
    settings: ReturnType<typeof parseWorkflowSettings>,
  ): number {
    return msUntilAllowedTimeWindow(settings);
  }

  async updateStepStatus(
    runId: string,
    stepIndex: number,
    status: AutomationWorkflowRunStepStatus,
    data?: {
      errorMessage?: string;
      output?: Record<string, unknown>;
      input?: Record<string, unknown>;
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
    if (data?.input) patch.input = data.input;
    if (data?.scheduledFor) patch.scheduledFor = data.scheduledFor;

    await this.runRepository.updateStep(runId, stepIndex, patch);
  }

  private async enqueueStepOrFail(
    runId: string,
    businessId: string,
    stepIndex: number,
    delayMs = 0,
  ): Promise<boolean> {
    try {
      const jobId = await this.queueService.enqueueAutomationStep(
        { businessId, runId, stepIndex },
        delayMs > 0 ? { delay: delayMs } : undefined,
      );
      return jobId != null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to enqueue automation step run=${runId} step=${stepIndex}: ${message}`,
      );
      return false;
    }
  }
}
