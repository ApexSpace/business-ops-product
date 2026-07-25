import { HttpStatus } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { ACTION_BY_KEY } from '../registries/action.registry';
import { TRIGGER_BY_KEY } from '../registries/trigger.registry';
import type { AutomationAudience } from '../types/automation-registry.types';
import type {
  WorkflowSettings,
  WorkflowStepDefinition,
  WorkflowTriggerFilter,
} from '../types/workflow.types';
import { DEFAULT_WORKFLOW_SETTINGS } from '../types/workflow.types';
import { isAllowedForAudience } from './automation-audience.util';

export function normalizeWorkflowSettings(
  settings?: Partial<WorkflowSettings> | null,
): WorkflowSettings {
  return {
    ...DEFAULT_WORKFLOW_SETTINGS,
    ...(settings ?? {}),
  };
}

export function assertValidTriggerKey(triggerKey: string): void {
  const trigger = TRIGGER_BY_KEY[triggerKey];
  if (!trigger) {
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      `Unknown trigger: ${triggerKey}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function assertTriggerAllowedForAudience(
  triggerKey: string,
  audience: AutomationAudience,
): void {
  assertValidTriggerKey(triggerKey);
  const trigger = TRIGGER_BY_KEY[triggerKey];
  if (!isAllowedForAudience(trigger.audiences, audience)) {
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      `Trigger is not available for ${audience}: ${triggerKey}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function assertActionsAllowedForAudience(
  steps: WorkflowStepDefinition[],
  audience: AutomationAudience,
): void {
  for (const step of steps) {
    const action = ACTION_BY_KEY[step.actionKey];
    if (!action) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Unknown action: ${step.actionKey}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!isAllowedForAudience(action.audiences, audience)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Action is not available for ${audience}: ${step.actionKey}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

export function assertActivatableWorkflow(
  triggerKey: string,
  steps: WorkflowStepDefinition[],
  audience?: AutomationAudience,
): void {
  const trigger = TRIGGER_BY_KEY[triggerKey];
  if (!trigger || trigger.implementationStatus !== 'implemented') {
    throw new AppException(
      ErrorCode.BAD_REQUEST,
      `Trigger is not available for activation: ${triggerKey}`,
      HttpStatus.BAD_REQUEST,
    );
  }
  if (audience) {
    assertTriggerAllowedForAudience(triggerKey, audience);
  }

  for (const step of steps) {
    const action = ACTION_BY_KEY[step.actionKey];
    if (!action || action.implementationStatus !== 'implemented') {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Action is not available for activation: ${step.actionKey}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  if (audience) {
    assertActionsAllowedForAudience(steps, audience);
  }
}

export function validateWorkflowSteps(steps: WorkflowStepDefinition[]): void {
  const seenIds = new Set<string>();
  for (const step of steps) {
    if (seenIds.has(step.id)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Duplicate step id: ${step.id}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    seenIds.add(step.id);

    const action = ACTION_BY_KEY[step.actionKey];
    if (!action) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Unknown action: ${step.actionKey}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const parsed = action.configSchema.safeParse(step.config ?? {});
    if (!parsed.success) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `Invalid config for ${step.actionKey}: ${parsed.error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

export function validateTriggerFilters(
  filters: WorkflowTriggerFilter[] | undefined,
): void {
  if (!filters?.length) return;
  for (const filter of filters) {
    if (!filter.fieldKey?.trim() || !filter.operator?.trim()) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Trigger filters require fieldKey and operator',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
