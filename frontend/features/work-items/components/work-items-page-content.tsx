"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { EntityListLayout } from "@/components/layout/entity-list-layout";
import { ListFilterCheckboxGroup } from "@/components/layout/list-filter-checkbox-group";
import { ListPage } from "@/components/layout/list-page";
import { WorkItemBoard } from "@/features/work-items/components/work-item-board";
import { WorkItemFormDialog } from "@/features/work-items/components/work-item-form-dialog";
import { WorkItemsPageToolbar } from "@/features/work-items/components/work-items-page-toolbar";
import {
  WorkItemsViewSwitcher,
} from "@/features/work-items/components/work-items-view-switcher";
import {
  useWorkItemsPageToolbar,
  workItemsStatusFilterItems,
} from "@/features/work-items/hooks/use-work-items-page-toolbar";
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const [draftServiceId, setDraftServiceId] = useState("");
  const [draftAssignedToId, setDraftAssignedToId] = useState("");

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

  const resetPage = { resetPage: true as const,
};

  return (
    <>
      {isBoardView ? (
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
            showServiceFilter={mode !== "platform"}
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
        className={cn("min-h-0")}
      >
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
      </ListPage>
      ) : (
      <EntityListLayout
        title={workItemsLabel}
        description={
          mode === "platform"
            ? "Track ops work for platform support — assign to support users."
            : "Record customer, service, and work done — without a CRM pipeline."
        }
        addButtonLabel={`Add ${countSingular}`}
        onAdd={canManage ? () => openCreate() : undefined}
        extraFilters={
          <WorkItemsViewSwitcher
            value={view}
            onChange={(next) =>
              setParams({ view: next, page: "1" }, resetPage)
            }
          />
        }
        searchPlaceholder={`Search ${workItemsLabel.toLowerCase()}…`}
        searchValue={params.search}
        onSearchChange={(value) =>
          setParams({ search: value, page: "1" }, resetPage)
        }
        filterAriaLabel="Work item filters"
        filterActive={Boolean(
          params.status || params.serviceId || params.assignedToId,
        )}
        filterOpen={filterOpen}
        onFilterOpenChange={(open) => {
          if (open) {
            setDraftStatus(params.status);
            setDraftServiceId(params.serviceId);
            setDraftAssignedToId(params.assignedToId);
          }
          setFilterOpen(open);
        }}
        filterContent={
          <>
            <ListFilterCheckboxGroup
              legend="Status"
              options={workItemsStatusFilterItems}
              value={draftStatus}
              onChange={(next) => setDraftStatus(String(next))}
            />
            {mode !== "platform" ? (
              <ListFilterCheckboxGroup
                legend="Service"
                options={serviceFilterItems}
                value={draftServiceId}
                onChange={(next) => setDraftServiceId(String(next))}
              />
            ) : null}
            <ListFilterCheckboxGroup
              legend="Staff"
              options={assigneeFilterItems}
              value={draftAssignedToId}
              onChange={(next) => setDraftAssignedToId(String(next))}
            />
          </>
        }
        onFilterApply={() =>
          setParams(
            {
              status: draftStatus,
              serviceId: draftServiceId,
              assignedToId: draftAssignedToId,
              page: "1",
            },
            resetPage,
          )
        }
        footer={
          data?.meta ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label={countPlural}
            />
          ) : undefined
        }
        columns={columns}
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        emptyTitle={`No ${countPlural} yet`}
        emptyDescription="Add your first record: pick a customer, service, and status."
        emptyAction={
          canManage ? (
            <ActionButton onClick={() => openCreate()}>
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
