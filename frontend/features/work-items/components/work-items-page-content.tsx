"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { ListPage } from "@/components/layout/list-page";
import { WorkItemBoard } from "@/features/work-items/components/work-item-board";
import { WorkItemFormDialog } from "@/features/work-items/components/work-item-form-dialog";
import { WorkItemsPageToolbar } from "@/features/work-items/components/work-items-page-toolbar";
import { useWorkItemsPageToolbar } from "@/features/work-items/hooks/use-work-items-page-toolbar";
import { useWorkItemStaffPermissions } from "@/features/work-items/hooks/use-work-item-staff-permissions";
import { useWorkItemsHost } from "@/features/work-items/work-items-host-context";
import { ActionButton } from "@/components/ui/action-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { deleteWorkItem } from "@/features/work-items/api/work-items.api";
import {
  invalidateBusinessDashboardStats,
  invalidateWorkItemLists,
} from "@/lib/query/invalidation";
import { cn } from "@/lib/utils";
import type { WorkItem, WorkItemStatus } from "@/features/work-items/types";

export function WorkItemsPageContent() {
  const queryClient = useQueryClient();
  const { apiBase, mode } = useWorkItemsHost();
  const { canManage } = useWorkItemStaffPermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkItem | null>(null);
  const [createDefaultStatus, setCreateDefaultStatus] = useState<
    WorkItemStatus | undefined
  >();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    params,
    page,
    setParams,
    view,
    isBoardView,
    workItemsLabel,
    listQueryKey,
    data,
    isLoading,
    columns,
    serviceFilterItems,
    assigneeFilterItems,
    countSingular,
    countPlural,
  } = useWorkItemsPageToolbar();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkItem(id, apiBase),
    onSuccess: () => {
      toast.success("Deleted");
      void invalidateWorkItemLists(queryClient, apiBase);
      if (mode === "business") {
        void invalidateBusinessDashboardStats(queryClient);
      }
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = (status?: WorkItemStatus) => {
    setEditing(null);
    setCreateDefaultStatus(status);
    setDialogOpen(true);
  };

  const openEdit = (item: WorkItem) => {
    setEditing(item);
    setDialogOpen(true);
  };

  const resetPage = { resetPage: true as const };

  return (
    <>
      <ListPage
        title={workItemsLabel}
        description={
          mode === "platform"
            ? "Track ops work for platform support — assign to support users."
            : "Record customer, service, and work done — without a CRM pipeline."
        }
        toolbar={
          <WorkItemsPageToolbar
            workItemsLabel={workItemsLabel}
            countSingular={countSingular}
            search={params.search}
            status={params.status}
            serviceId={params.serviceId}
            assignedToId={params.assignedToId}
            view={view}
            serviceFilterItems={serviceFilterItems}
            assigneeFilterItems={assigneeFilterItems}
            onSearchChange={(value) =>
              setParams({ search: value, page: "1" }, resetPage)
            }
            onStatusChange={(value) =>
              setParams({ status: value ?? "", page: "1" }, resetPage)
            }
            onServiceIdChange={(value) =>
              setParams({ serviceId: value ?? "", page: "1" }, resetPage)
            }
            onAssignedToIdChange={(value) =>
              setParams({ assignedToId: value ?? "", page: "1" }, resetPage)
            }
            onViewChange={(next) =>
              setParams({ view: next, page: "1" }, resetPage)
            }
            onAddClick={() => openCreate()}
            canManage={canManage}
          />
        }
        pagination={
          !isBoardView && data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label={countPlural}
            />
          ) : null
        }
        className={cn(isBoardView && "min-h-0")}
      >
        {isBoardView ? (
          <WorkItemBoard
            items={data?.items ?? []}
            isLoading={isLoading}
            statusFilter={(params.status as WorkItemStatus) || ""}
            listQueryKey={listQueryKey}
            truncatedTotal={data?.meta.total}
            countSingular={countSingular}
            countPlural={countPlural}
            onEdit={canManage ? openEdit : undefined}
            onDelete={canManage ? (item) => setDeleteId(item.id) : undefined}
            onAddItem={canManage ? openCreate : undefined}
            canManage={canManage}
          />
        ) : (
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            getRowId={(row) => row.id}
            isLoading={isLoading}
            emptyTitle={`No ${countPlural} yet`}
            emptyDescription="Add your first record: pick a customer, service, and status."
            emptyAction={
              canManage ? (
                <ActionButton onClick={() => openCreate()}>
                  <Plus className="mr-2 size-4" />
                  Add {countSingular}
                </ActionButton>
              ) : undefined
            }
            rowActions={
              canManage
                ? (item) => (
                    <DataTableRowActions
                      actions={[
                        { label: "Edit", onClick: () => openEdit(item) },
                        {
                          label: "Delete",
                          onClick: () => setDeleteId(item.id),
                          destructive: true,
                        },
                      ]}
                    />
                  )
                : undefined
            }
          />
        )}
      </ListPage>

      <WorkItemFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workItem={editing}
        defaultStatus={editing ? undefined : createDefaultStatus}
        onSuccess={() => {
          void invalidateWorkItemLists(queryClient, apiBase);
          if (mode === "business") {
            void invalidateBusinessDashboardStats(queryClient);
          }
        }}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={`Delete ${countSingular}?`}
        description="This action cannot be undone."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </>
  );
}
