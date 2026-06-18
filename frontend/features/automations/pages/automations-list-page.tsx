"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { workflowStatusLabel } from "@/features/automations/api/workflows.api";
import {
  useAutomationWorkflowMutations,
  useAutomationWorkflowsList,
} from "@/features/automations/hooks/use-automation-workflows";
import type { AutomationWorkflow } from "@/features/automations/types/workflow";

function statusVariant(
  status: AutomationWorkflow["status"],
): "default" | "secondary" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "DRAFT") return "secondary";
  return "outline";
}

function AutomationsListPageContent() {
  const router = useRouter();
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
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={statusVariant(row.status)}>
              {workflowStatusLabel(row.status)}
            </Badge>
            {row.isSystemTemplate ? (
              <Badge variant="outline">Template</Badge>
            ) : null}
          </div>
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
                  router.push(
                    `/business/settings/automation-workflows/${row.id}`,
                  ),
              },
              {
                label: row.status === "ACTIVE" ? "Deactivate" : "Activate",
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
    <ListPage
      title="Automations"
      description="Linear workflows that run when triggers fire."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.push("/business/settings/automation-registry")
            }
          >
            Registry
          </Button>
          <ActionButton
            onClick={() =>
              router.push("/business/settings/automation-workflows/new")
            }
          >
            <Plus className="size-4" />
            Create workflow
          </ActionButton>
        </div>
      }
    >
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No workflows yet"
        emptyDescription="Create one to get started."
      />

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
    </ListPage>
  );
}

export function AutomationsListPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <AutomationsListPageContent />
    </Suspense>
  );
}
