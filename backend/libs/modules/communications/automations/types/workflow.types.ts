export type WorkflowRunPolicy =
  | 'every_time'
  | 'once_per_context'
  | 'once_per_subject';

export interface WorkflowSettings {
  allowReentry: boolean;
  allowMultipleContexts: boolean;
  stopOnResponse: boolean;
  runPolicy: WorkflowRunPolicy;
  timezone: string | null;
  timeWindowEnabled: boolean;
  timeWindow: { start: string; end: string } | null;
  senderFromName: string | null;
  senderFromEmail: string | null;
  senderFromNumber: string | null;
  markConversationsRead: boolean;
}

export interface WorkflowTriggerFilter {
  fieldKey: string;
  operator: string;
  value?: unknown;
}

export interface WorkflowStepDefinition {
  id: string;
  actionKey: string;
  config: Record<string, unknown>;
}

export const DEFAULT_WORKFLOW_SETTINGS: WorkflowSettings = {
  allowReentry: false,
  allowMultipleContexts: true,
  stopOnResponse: false,
  runPolicy: 'once_per_context',
  timezone: null,
  timeWindowEnabled: false,
  timeWindow: null,
  senderFromName: null,
  senderFromEmail: null,
  senderFromNumber: null,
  markConversationsRead: false,
};

export interface AutomationStepJobPayload {
  businessId: string;
  runId: string;
  stepIndex: number;
}

export interface AutomationRunContext {
  businessId: string;
  workflowId: string;
  runId: string;
  triggerKey: string;
  subjectId: string;
  subjectType: string;
  contextEntityId?: string;
  contextEntityType?: string;
  contactId?: string;
  appointmentId?: string;
  leadId?: string;
  invoiceId?: string;
  metadata?: Record<string, unknown>;
}
