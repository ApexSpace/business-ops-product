import { Injectable, Logger } from '@nestjs/common';
import {
  AutomationWorkflowRunStatus,
  AutomationWorkflowRunStepStatus,
} from '@prisma/client';
import { parseWorkflowSettings } from '../../mappers/automation-workflow.mapper';
import type { AutomationStepJobPayload } from '../../types/workflow.types';
import { AutomationWorkflowRunRepository } from '../../repositories/automation-workflow.repository';
import { AutomationActionExecutorService } from '../../services/automation-action-executor.service';
import { AutomationEngineService } from '../../services/automation-engine.service';

@Injectable()
export class AutomationStepProcessor {
  private readonly logger = new Logger(AutomationStepProcessor.name);

  constructor(
    private readonly runRepository: AutomationWorkflowRunRepository,
    private readonly engineService: AutomationEngineService,
    private readonly actionExecutor: AutomationActionExecutorService,
  ) {}

  async process(payload: AutomationStepJobPayload): Promise<void> {
    const run = await this.runRepository.findRunById(payload.runId);
    if (!run) {
      this.logger.warn(`Automation run not found: ${payload.runId}`);
      return;
    }

    if (
      run.status === AutomationWorkflowRunStatus.COMPLETED ||
      run.status === AutomationWorkflowRunStatus.FAILED ||
      run.status === AutomationWorkflowRunStatus.CANCELLED
    ) {
      return;
    }

    const step = run.steps.find((s) => s.stepIndex === payload.stepIndex);
    if (!step) {
      await this.engineService.markRunFailed(
        run.id,
        `Step ${payload.stepIndex} not found`,
      );
      return;
    }

    if (
      step.status === AutomationWorkflowRunStepStatus.COMPLETED ||
      step.status === AutomationWorkflowRunStepStatus.SKIPPED
    ) {
      return;
    }

    await this.engineService.updateStepStatus(
      run.id,
      payload.stepIndex,
      AutomationWorkflowRunStepStatus.RUNNING,
      {
        input: ((step.config ?? {}) as Record<string, unknown>),
      },
    );

    await this.runRepository.updateRun(run.id, {
      status: AutomationWorkflowRunStatus.RUNNING,
      currentStepIndex: payload.stepIndex,
    });

    try {
      const context = this.engineService.buildContextFromRun(run);
      const result = await this.actionExecutor.execute(
        step.actionKey,
        (step.config ?? {}) as Record<string, unknown>,
        context,
        run.workflow.createdById,
      );

      if (result.type === 'end') {
        await this.engineService.updateStepStatus(
          run.id,
          payload.stepIndex,
          AutomationWorkflowRunStepStatus.COMPLETED,
          { output: result.output },
        );
        await this.engineService.markRunCompleted(run.id);
        return;
      }

      if (result.type === 'delay_current') {
        const scheduledFor = new Date(Date.now() + result.delayMs);
        await this.engineService.updateStepStatus(
          run.id,
          payload.stepIndex,
          AutomationWorkflowRunStepStatus.WAITING,
          { output: result.output, scheduledFor },
        );
        await this.engineService.reEnqueueStep(
          run.id,
          payload.stepIndex,
          result.delayMs,
        );
        return;
      }

      if (result.type === 'delay') {
        const scheduledFor = new Date(Date.now() + result.delayMs);
        await this.engineService.updateStepStatus(
          run.id,
          payload.stepIndex,
          AutomationWorkflowRunStepStatus.WAITING,
          { output: result.output, scheduledFor },
        );
        await this.engineService.advanceToNextStep(
          run.id,
          payload.stepIndex,
          result.delayMs,
        );
        return;
      }

      if (result.type === 'branch') {
        await this.engineService.updateStepStatus(
          run.id,
          payload.stepIndex,
          AutomationWorkflowRunStepStatus.COMPLETED,
          { output: result.output },
        );
        await this.engineService.advanceToStepById(
          run.id,
          result.nextStepId,
          payload.stepIndex,
          result.delayMs ?? 0,
        );
        return;
      }

      await this.engineService.updateStepStatus(
        run.id,
        payload.stepIndex,
        AutomationWorkflowRunStepStatus.COMPLETED,
        { output: result.output },
      );
      await this.engineService.advanceToNextStep(run.id, payload.stepIndex);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Automation step failed';
      this.logger.error(
        `Automation step failed run=${run.id} step=${payload.stepIndex}: ${message}`,
      );
      await this.engineService.updateStepStatus(
        run.id,
        payload.stepIndex,
        AutomationWorkflowRunStepStatus.FAILED,
        { errorMessage: message },
      );
      await this.engineService.markRunFailed(run.id, message);
    }
  }
}
