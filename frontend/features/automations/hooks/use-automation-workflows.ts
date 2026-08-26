import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflow,
  listWorkflowRuns,
  listWorkflows,
  updateWorkflow,
  updateWorkflowStatus,
} from "@/features/automations/api/workflows.api";
import { useAutomationsHost } from "@/features/automations/automations-host-context";
import type {
  CreateWorkflowBody,
  UpdateWorkflowBody,
  WorkflowListFilters,
  WorkflowRunListFilters,
  WorkflowStatus,
} from "@/features/automations/types/workflow";
import { queryKeys } from "@/lib/query/keys";

export function useAutomationWorkflowsList(filters: WorkflowListFilters = {}) {
  const { apiBase } = useAutomationsHost();
  return useQuery({
    queryKey: queryKeys.automations.workflows.list(apiBase, filters),
    queryFn: () => listWorkflows(filters, apiBase),
  });
}

export function useAutomationWorkflowDetail(id: string | null) {
  const { apiBase } = useAutomationsHost();
  return useQuery({
    queryKey: queryKeys.automations.workflows.detail(apiBase, id ?? ""),
    queryFn: () => getWorkflow(id!, apiBase),
    enabled: !!id,
  });
}

export function useAutomationWorkflowRuns(filters: WorkflowRunListFilters = {}) {
  const { apiBase } = useAutomationsHost();
  return useQuery({
    queryKey: queryKeys.automations.workflowRuns.list(apiBase, filters),
    queryFn: () => listWorkflowRuns(filters, apiBase),
  });
}

export function useAutomationWorkflowMutations() {
  const { apiBase } = useAutomationsHost();
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.automations.workflows.all(apiBase),
    });
  };

  const createMutation = useMutation({
    mutationFn: (body: CreateWorkflowBody) => createWorkflow(body, apiBase),
    onSuccess: async () => {
      await invalidate();
      toast.success("Workflow created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body,
}: { id: string; body: UpdateWorkflowBody }) =>
      updateWorkflow(id, body, apiBase),
    onSuccess: async (_, { id }) => {
      await invalidate();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.automations.workflows.detail(apiBase, id),
      });
      toast.success("Workflow saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status,
}: { id: string; status: WorkflowStatus }) =>
      updateWorkflowStatus(id, status, apiBase),
    onSuccess: async () => {
      await invalidate();
      toast.success("Workflow status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkflow(id, apiBase),
    onSuccess: async () => {
      await invalidate();
      toast.success("Workflow deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    createMutation,
    updateMutation,
    statusMutation,
    deleteMutation,
  };
}
