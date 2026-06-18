export type WorkflowStatus = "DRAFT" | "ACTIVE" | "INACTIVE";

export type WorkflowRunStatus =
  | "RUNNING"
  | "WAITING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type WorkflowStep = {
  id: string;
  actionKey: string;
  config: Record<string, unknown>;
};

export type WorkflowTriggerFilter = {
  fieldKey: string;
  operator: string;
  value?: unknown;
};

export type WorkflowSettings = {
  allowReentry?: boolean;
  allowMultipleContexts?: boolean;
  stopOnResponse?: boolean;
  runPolicy?: "every_time" | "once_per_context" | "once_per_subject" | "once_per_period";
  runPolicyPeriodDays?: number;
  timezone?: string | null;
  timeWindowEnabled?: boolean;
  timeWindow?: { start: string; end: string } | null;
  senderFromName?: string | null;
  senderFromEmail?: string | null;
  senderFromNumber?: string | null;
  markConversationsRead?: boolean;
};

export type AutomationWorkflow = {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  triggerKey: string;
  triggerFilters: WorkflowTriggerFilter[];
  steps: WorkflowStep[];
  settings: WorkflowSettings;
  isSystemTemplate: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string } | null;
  activatable: boolean;
};

export type AutomationWorkflowRun = {
  id: string;
  businessId: string;
  workflowId: string;
  workflowName?: string;
  status: WorkflowRunStatus;
  triggerKey: string;
  subjectId: string;
  subjectType: string;
  contextEntityId: string | null;
  contextEntityType: string | null;
  contactId: string | null;
  currentStepIndex: number;
  enrollmentReason: string | null;
  startedAt: string;
  completedAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  steps: Array<{
    id: string;
    stepIndex: number;
    actionKey: string;
    status: string;
    errorMessage: string | null;
    startedAt: string | null;
    completedAt: string | null;
    scheduledFor: string | null;
    input?: unknown;
    output?: unknown;
  }>;
};

export type CreateWorkflowBody = {
  name: string;
  description?: string;
  triggerKey: string;
  triggerFilters?: WorkflowTriggerFilter[];
  steps: WorkflowStep[];
  settings?: WorkflowSettings;
};

export type UpdateWorkflowBody = CreateWorkflowBody;

export type WorkflowListFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: WorkflowStatus;
  triggerKey?: string;
};

export type WorkflowRunListFilters = {
  page?: number;
  limit?: number;
  workflowId?: string;
  contactId?: string;
  status?: WorkflowRunStatus;
  triggerKey?: string;
  startedAfter?: string;
  startedBefore?: string;
};
