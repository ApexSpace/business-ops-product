import { AutomationWorkflowStatus } from '@prisma/client';
import type { AutomationWorkflowRecord } from '../repositories/automation-workflow.repository';
import type {
  WorkflowSettings,
  WorkflowStepDefinition,
  WorkflowTriggerFilter,
} from '../types/workflow.types';
import { DEFAULT_WORKFLOW_SETTINGS } from '../types/workflow.types';

export function parseWorkflowSteps(value: unknown): WorkflowStepDefinition[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (step): step is WorkflowStepDefinition =>
      typeof step === 'object' &&
      step !== null &&
      typeof (step as WorkflowStepDefinition).id === 'string' &&
      typeof (step as WorkflowStepDefinition).actionKey === 'string' &&
      typeof (step as WorkflowStepDefinition).config === 'object',
  );
}

export function parseWorkflowSettings(value: unknown): WorkflowSettings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_WORKFLOW_SETTINGS };
  }
  return {
    ...DEFAULT_WORKFLOW_SETTINGS,
    ...(value as Partial<WorkflowSettings>),
  };
}

export function parseWorkflowTriggerFilters(
  value: unknown,
): WorkflowTriggerFilter[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (filter): filter is WorkflowTriggerFilter =>
      typeof filter === 'object' &&
      filter !== null &&
      typeof (filter as WorkflowTriggerFilter).fieldKey === 'string' &&
      typeof (filter as WorkflowTriggerFilter).operator === 'string',
  );
}

export function toAutomationWorkflowResponse(workflow: AutomationWorkflowRecord) {
  return {
    id: workflow.id,
    businessId: workflow.businessId,
    name: workflow.name,
    description: workflow.description,
    status: workflow.status,
    triggerKey: workflow.triggerKey,
    triggerFilters: parseWorkflowTriggerFilters(workflow.triggerFilters),
    steps: parseWorkflowSteps(workflow.steps),
    settings: parseWorkflowSettings(workflow.settings),
    isSystemTemplate: workflow.isSystemTemplate,
    createdById: workflow.createdById,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    createdBy: workflow.createdBy
      ? {
          id: workflow.createdBy.id,
          name:
            [workflow.createdBy.firstName, workflow.createdBy.lastName]
              .filter(Boolean)
              .join(' ')
              .trim() || workflow.createdBy.email,
        }
      : null,
    activatable: workflow.status === AutomationWorkflowStatus.ACTIVE,
  };
}

export function toAutomationWorkflowRunResponse(run: {
  id: string;
  businessId: string;
  workflowId: string;
  status: string;
  triggerKey: string;
  subjectId: string;
  subjectType: string;
  contextEntityId: string | null;
  contextEntityType: string | null;
  contactId: string | null;
  currentStepIndex: number;
  enrollmentReason: string | null;
  startedAt: Date;
  completedAt: Date | null;
  failedAt: Date | null;
  errorMessage: string | null;
  workflow?: { id: string; name: string; triggerKey: string };
  steps?: Array<{
    id: string;
    stepIndex: number;
    actionKey: string;
    status: string;
    errorMessage: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    scheduledFor: Date | null;
    input: unknown;
    output: unknown;
  }>;
}) {
  return {
    id: run.id,
    businessId: run.businessId,
    workflowId: run.workflowId,
    workflowName: run.workflow?.name,
    status: run.status,
    triggerKey: run.triggerKey,
    subjectId: run.subjectId,
    subjectType: run.subjectType,
    contextEntityId: run.contextEntityId,
    contextEntityType: run.contextEntityType,
    contactId: run.contactId,
    currentStepIndex: run.currentStepIndex,
    enrollmentReason: run.enrollmentReason,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    failedAt: run.failedAt?.toISOString() ?? null,
    errorMessage: run.errorMessage,
    steps:
      run.steps?.map((step) => ({
        id: step.id,
        stepIndex: step.stepIndex,
        actionKey: step.actionKey,
        status: step.status,
        errorMessage: step.errorMessage,
        startedAt: step.startedAt?.toISOString() ?? null,
        completedAt: step.completedAt?.toISOString() ?? null,
        scheduledFor: step.scheduledFor?.toISOString() ?? null,
        input: step.input,
        output: step.output,
      })) ?? [],
  };
}
