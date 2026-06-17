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
import type {
  CreateWorkflowBody,
  UpdateWorkflowBody,
  WorkflowListFilters,
  WorkflowRunListFilters,
  WorkflowStatus,
} from "@/features/automations/types/workflow";
import { queryKeys } from "@/lib/query/keys";

export function useAutomationWorkflowsList(filters: WorkflowListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.automations.workflows.list(filters),
    queryFn: () => listWorkflows(filters),
  });
}

export function useAutomationWorkflowDetail(id: string | null) {
  return useQuery({
    queryKey: queryKeys.automations.workflows.detail(id ?? ""),
    queryFn: () => getWorkflow(id!),
    enabled: !!id,
  });
}

export function useAutomationWorkflowRuns(filters: WorkflowRunListFilters = {}) {
  return useQuery({
    queryKey: queryKeys.automations.workflowRuns.list(filters),
    queryFn: () => listWorkflowRuns(filters),
  });
}

export function useAutomationWorkflowMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.automations.workflows.all(),
    });
  };

  const createMutation = useMutation({
    mutationFn: (body: CreateWorkflowBody) => createWorkflow(body),
    onSuccess: async () => {
      await invalidate();
      toast.success("Workflow created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateWorkflowBody }) =>
      updateWorkflow(id, body),
    onSuccess: async (_, { id }) => {
      await invalidate();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.automations.workflows.detail(id),
      });
      toast.success("Workflow saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkflowStatus }) =>
      updateWorkflowStatus(id, status),
    onSuccess: async () => {
      await invalidate();
      toast.success("Workflow status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
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
