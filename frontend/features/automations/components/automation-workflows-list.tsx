"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { workflowStatusLabel } from "@/features/automations/api/workflows.api";
import {
  useAutomationWorkflowMutations,
  useAutomationWorkflowsList,
} from "@/features/automations/hooks/use-automation-workflows";
import type { AutomationWorkflow } from "@/features/automations/types/workflow";

const WorkflowCreateDialog = dynamic(
  () =>
    import("@/features/automations/components/workflow-create-dialog").then(
      (m) => m.WorkflowCreateDialog,
    ),
  { ssr: false },
);

function statusVariant(
  status: AutomationWorkflow["status"],
): "default" | "secondary" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "DRAFT") return "secondary";
  return "outline";
}

export function AutomationWorkflowsList() {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data, isLoading } = useAutomationWorkflowsList({ limit: 50 });
  const { statusMutation, deleteMutation } = useAutomationWorkflowMutations();

  const columns = useMemo<DataTableColumn<AutomationWorkflow>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        cell: (row) => (
          <div>
            <p className="font-medium">{row.name}</p>
            {row.description ? (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {row.description}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: "trigger",
        header: "Trigger",
        cell: (row) => (
          <span className="font-mono text-xs">{row.triggerKey}</span>
        ),
      },
      {
        id: "steps",
        header: "Steps",
        cell: (row) => row.steps.length,
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <Badge variant={statusVariant(row.status)}>
            {workflowStatusLabel(row.status)}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (row) => (
          <DataTableRowActions
            actions={[
              {
                label: "Edit",
                onClick: () =>
                  router.push(`/business/settings/automations/${row.id}`),
              },
              {
                label:
                  row.status === "ACTIVE" ? "Deactivate" : "Activate",
                onClick: () =>
                  statusMutation.mutate({
                    id: row.id,
                    status: row.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                  }),
              },
              {
                label: "Delete",
                destructive: true,
                onClick: () => setDeleteId(row.id),
              },
            ]}
          />
        ),
      },
    ],
    [router, statusMutation],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Workflows"
        description="Linear automations that run when triggers fire."
        actions={
          <ActionButton onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Create workflow
          </ActionButton>
        }
      />

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No workflows yet"
        emptyDescription="Create one to get started."
      />

      {createOpen ? (
        <WorkflowCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
      ) : null}

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete workflow"
        description="This workflow will be removed. Existing run logs are kept."
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
