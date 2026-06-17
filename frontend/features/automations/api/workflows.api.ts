import { api } from "@/lib/api/client";
import type {
  AutomationWorkflow,
  AutomationWorkflowRun,
  CreateWorkflowBody,
  UpdateWorkflowBody,
  WorkflowListFilters,
  WorkflowRunListFilters,
} from "@/features/automations/types/workflow";

export function listWorkflows(filters: WorkflowListFilters = {}) {
  return api.getPaginated<AutomationWorkflow>("automations/workflows", {
    searchParams: filters,
  });
}

export function getWorkflow(id: string) {
  return api.get<AutomationWorkflow>(`automations/workflows/${id}`);
}

export function createWorkflow(body: CreateWorkflowBody) {
  return api.post<AutomationWorkflow>("automations/workflows", body);
}

export function updateWorkflow(id: string, body: UpdateWorkflowBody) {
  return api.patch<AutomationWorkflow>(`automations/workflows/${id}`, body);
}

export function updateWorkflowStatus(
  id: string,
  status: AutomationWorkflow["status"],
) {
  return api.patch<AutomationWorkflow>(`automations/workflows/${id}/status`, {
    status,
  });
}

export function deleteWorkflow(id: string) {
  return api.delete<{ success: boolean }>(`automations/workflows/${id}`);
}

export function listWorkflowRuns(filters: WorkflowRunListFilters = {}) {
  return api.getPaginated<AutomationWorkflowRun>("automations/workflows/runs", {
    searchParams: filters,
  });
}

export function getWorkflowRun(runId: string) {
  return api.get<AutomationWorkflowRun>(`automations/workflows/runs/${runId}`);
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
