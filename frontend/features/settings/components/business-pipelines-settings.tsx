"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import {
  deletePipeline,
  formatPipelineTableDate,
  getPipelineStageCount,
  listPipelines,
  pipelineDefaultLabel,
} from "@/features/pipelines/api/pipelines.api";
import { PipelineFormDialog } from "@/features/pipelines/components/pipeline-form-dialog";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import { invalidatePipelines } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import type { Pipeline } from "@/features/pipelines/types";

function pipelineDefaultVariant(
  pipeline: Pipeline,
): "default" | "secondary" {
  return pipeline.isDefault ? "default" : "secondary";
}

export function BusinessPipelinesSettings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage = useCan(PERMISSIONS["pipelines.manage"]);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: pipelines, isLoading } = useQuery({
    queryKey: queryKeys.pipelines.list(),
    queryFn: () => listPipelines(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePipeline(id),
    onSuccess: async () => {
      await invalidatePipelines(queryClient);
      toast.success("Pipeline deleted");
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteTarget = useMemo(
    () => pipelines?.find((p) => p.id === deleteId) ?? null,
    [pipelines, deleteId],
  );

  const columns = useMemo<DataTableColumn<Pipeline>[]>(
    () => [
      {
        id: "name",
        header: "Pipeline",
        sortable: true,
        sortValue: (row) => row.name,
        cell: (row) => (
          <div className="min-w-[180px]">
            <Link
              href={`/business/settings/pipelines/${row.id}/edit`}
              className="font-medium hover:underline"
            >
              {row.name}
            </Link>
          </div>
        ),
      },
      {
        id: "stages",
        header: "Stages",
        sortable: true,
        sortValue: (row) => getPipelineStageCount(row),
        className: "text-right tabular-nums",
        cell: (row) => (
          <span className="tabular-nums text-sm">
            {getPipelineStageCount(row)}
          </span>
        ),
      },
      {
        id: "role",
        header: "Role",
        sortable: true,
        sortValue: (row) => pipelineDefaultLabel(row),
        cell: (row) => (
          <Badge variant={pipelineDefaultVariant(row)}>
            {pipelineDefaultLabel(row)}
          </Badge>
        ),
      },
      {
        id: "updated",
        header: "Updated",
        sortable: true,
        sortValue: (row) => row.updatedAt,
        className: "whitespace-nowrap",
        cell: (row) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {formatPipelineTableDate(row.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  const buildRowActions = (row: Pipeline) => {
    if (!canManage) return null;

    return (
      <DataTableRowActions
        menuLabel={`Actions for ${row.name}`}
        actions={[
          {
            label: "Edit",
            onClick: () =>
              router.push(`/business/settings/pipelines/${row.id}/edit`),
          },
          {
            label: "Delete",
            onClick: () => setDeleteId(row.id),
            destructive: true,
            disabled: row.isDefault,
          },
        ]}
      />
    );
  };

  return (
    <div className="w-full min-w-0 space-y-[var(--page-stack-gap)]">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/business/pipelines" />}
            >
              Open CRM Pipeline
            </Button>
            {canManage ? (
              <ActionButton onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 size-4" />
                New pipeline
              </ActionButton>
            ) : null}
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={pipelines ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle="No pipelines yet"
        emptyDescription={
          canManage
            ? "Create a pipeline to define stages for your CRM board."
            : "Ask an owner or admin to set up pipelines."
        }
        emptyAction={
          canManage ? (
            <ActionButton onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              New pipeline
            </ActionButton>
          ) : undefined
        }
        rowActions={buildRowActions}
      />

      <PipelineFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pipeline={null}
        onSuccess={(pipelineId) => {
          void invalidatePipelines(queryClient);
          if (pipelineId) {
            router.push(`/business/settings/pipelines/${pipelineId}/edit`);
          }
        }}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete pipeline?"
        description={
          deleteTarget?.isDefault
            ? "The default pipeline cannot be deleted."
            : "This pipeline and its stages will be removed. Pipelines with active leads cannot be deleted."
        }
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
