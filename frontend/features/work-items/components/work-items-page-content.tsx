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
import { WorkItemsPageFilters } from "@/features/work-items/components/work-items-page-filters";
import {
  WorkItemsViewSwitcher,
} from "@/features/work-items/components/work-items-view-switcher";
import { useWorkItemsPageToolbar } from "@/features/work-items/hooks/use-work-items-page-toolbar";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkItem | null>(null);
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
    mutationFn: (id: string) => deleteWorkItem(id),
    onSuccess: () => {
      toast.success("Deleted");
      void invalidateWorkItemLists(queryClient);
      void invalidateBusinessDashboardStats(queryClient);
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openCreate = () => {
    setEditing(null);
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
        description="Record customer, service, and work done — without a CRM pipeline."
        actions={
          <>
            <WorkItemsViewSwitcher
              value={view}
              onChange={(next) =>
                setParams({ view: next, page: "1" }, resetPage)
              }
            />
            <ActionButton onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              Add {countSingular}
            </ActionButton>
          </>
        }
        filters={
          <WorkItemsPageFilters
            workItemsLabel={workItemsLabel}
            search={params.search}
            status={params.status}
            serviceId={params.serviceId}
            assignedToId={params.assignedToId}
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
            onEdit={openEdit}
            onDelete={setDeleteId}
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
              <ActionButton onClick={openCreate}>
                <Plus className="mr-2 size-4" />
                Add {countSingular}
              </ActionButton>
            }
            rowActions={(item) => (
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
            )}
          />
        )}
      </ListPage>

      <WorkItemFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workItem={editing}
        onSuccess={() => {
          void invalidateWorkItemLists(queryClient);
          void invalidateBusinessDashboardStats(queryClient);
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
