import { api } from "@/lib/api/client";
import type {
  AutomationWorkflow,
  AutomationWorkflowRun,
  CreateWorkflowBody,
  UpdateWorkflowBody,
  WorkflowListFilters,
  WorkflowRunListFilters,
} from "@/features/automations/types/workflow";

const DEFAULT_API_BASE = "automations";

function workflowsPath(apiBase: string, ...segments: string[]) {
  return [apiBase, "workflows", ...segments].filter(Boolean).join("/");
}

export function listWorkflows(
  filters: WorkflowListFilters = {},
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.getPaginated<AutomationWorkflow>(workflowsPath(apiBase), {
    searchParams: filters,
  });
}

export function getWorkflow(id: string, apiBase: string = DEFAULT_API_BASE) {
  return api.get<AutomationWorkflow>(workflowsPath(apiBase, id));
}

export function createWorkflow(
  body: CreateWorkflowBody,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.post<AutomationWorkflow>(workflowsPath(apiBase), body);
}

export function updateWorkflow(
  id: string,
  body: UpdateWorkflowBody,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.patch<AutomationWorkflow>(workflowsPath(apiBase, id), body);
}

export function updateWorkflowStatus(
  id: string,
  status: AutomationWorkflow["status"],
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.patch<AutomationWorkflow>(workflowsPath(apiBase, id, "status"), {
    status,
  });
}

export function deleteWorkflow(id: string, apiBase: string = DEFAULT_API_BASE) {
  return api.delete<{ success: boolean }>(workflowsPath(apiBase, id));
}

export function listWorkflowRuns(
  filters: WorkflowRunListFilters = {},
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.getPaginated<AutomationWorkflowRun>(
    workflowsPath(apiBase, "runs"),
    {
      searchParams: filters,
    },
  );
}

export function getWorkflowRun(
  runId: string,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.get<AutomationWorkflowRun>(workflowsPath(apiBase, "runs", runId));
}

export function workflowStatusLabel(status: AutomationWorkflow["status"]) {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    default:
      return "Draft";
  }
}
