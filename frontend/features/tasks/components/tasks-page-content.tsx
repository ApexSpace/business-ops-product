"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DataTableRowActions,
} from "@/components/data-display/data-table-row-actions";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { EntityListLayout } from "@/components/layout/entity-list-layout";
import { ListFilterCheckboxGroup } from "@/components/layout/list-filter-checkbox-group";
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog";
import { TasksMobileList } from "@/features/tasks/components/mobile/tasks-mobile-list";
import { useTasksPageColumns } from "@/features/tasks/hooks/use-tasks-page-columns";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ui/list-pagination";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useListSearchParams } from "@/lib/hooks/use-list-search-params";
import { useEntitySelection } from "@/lib/routing/use-entity-selection";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { WORKSPACE_ACTIVE_ROW_CLASS } from "@/lib/design/workspace-tokens";
import { completeTask, deleteTask, reopenTask } from "@/features/tasks/api/tasks.api";
import { useTasksList } from "@/features/tasks/hooks/use-tasks-list";
import { listBusinessMembers } from "@/features/settings/api/business.api";
import { PERMISSIONS, useCan } from "@/features/auth/permissions";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "@/features/tasks/schemas/task-profile";
import { invalidateTaskLists } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";
import type { Task } from "@/features/tasks/types";

const LIST_SCHEMA = {
  page: { default: "1" },
  search: { default: "" },
  status: { default: "" },
  priority: { default: "" },
  assignedToId: { default: "" },
} as const;

const PAGE_LIMIT = 20;

const statusFilterItems = [
  { value: "", label: "All statuses" },
  ...TASK_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

const priorityFilterItems = [
  { value: "", label: "All priorities" },
  ...TASK_PRIORITY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
];

export function TasksPageContent() {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const canAssign = useCan(PERMISSIONS["members.invite"]);
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const {
    selectedId,
    setSelectedId,
    clearSelection,
  } = useEntitySelection();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState(params.status);
  const [draftPriority, setDraftPriority] = useState(params.priority);
  const [draftAssignee, setDraftAssignee] = useState(params.assignedToId);

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
    status: params.status || undefined,
    priority: params.priority || undefined,
    assignedToId: params.assignedToId || undefined,
  };

  const { data, isLoading } = useTasksList(listFilters);

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () => listBusinessMembers({ page: 1, limit: 100 }),
    enabled: canAssign,
  });

  const assigneeFilterItems = useMemo(() => {
    const items =
      members?.items.map((m) => ({
        value: m.user.id,
        label:
          [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") ||
          m.user.email,
      })) ?? [];
    return [{ value: "", label: "All assignees" }, ...items];
  }, [members?.items]);

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      toast.success("Task deleted");
      void invalidateTaskLists(queryClient);
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const completeMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: () => {
      toast.success("Task completed");
      void invalidateTaskLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reopenMutation = useMutation({
    mutationFn: reopenTask,
    onSuccess: () => {
      toast.success("Task reopened");
      void invalidateTaskLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns = useTasksPageColumns();

  const openTask = (task: Task) => {
    setEditing(task);
    setSelectedId(task.id);
    setDialogOpen(true);
  };

  return (
    <>
      {isMobile ? (
        <TasksMobileList
          tasks={data?.items ?? []}
          isLoading={isLoading}
          search={params.search}
          onSearchChange={(search) => setParams({ search, page: "1" })}
          selectedId={selectedId}
          onSelect={openTask}
          onCreate={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          pagination={
            data?.meta
              ? {
                  meta: data.meta,
                  page,
                  onPageChange: (p) => setParams({ page: String(p) }),
                }
              : undefined
          }
        />
      ) : (
      <EntityListLayout
        title="Tasks"
        description="Follow-up actions with due dates, linked to contacts and leads."
        addButtonLabel="New task"
        onAdd={() => {
          setEditing(null);
          setDialogOpen(true);
        }}
        searchPlaceholder="Search tasks…"
        searchValue={params.search}
        onSearchChange={(search) => setParams({ search, page: "1" })}
        filterAriaLabel="Task filters"
        filterActive={Boolean(
          params.status || params.priority || params.assignedToId,
        )}
        filterOpen={filterOpen}
        onFilterOpenChange={(open) => {
          if (open) {
            setDraftStatus(params.status);
            setDraftPriority(params.priority);
            setDraftAssignee(params.assignedToId);
          }
          setFilterOpen(open);
        }}
        filterContent={
          <>
            <ListFilterCheckboxGroup
              legend="Status"
              options={statusFilterItems}
              value={draftStatus}
              onChange={(next) => setDraftStatus(String(next))}
            />
            <ListFilterCheckboxGroup
              legend="Priority"
              options={priorityFilterItems}
              value={draftPriority}
              onChange={(next) => setDraftPriority(String(next))}
            />
            {canAssign ? (
              <ListFilterCheckboxGroup
                legend="Assignee"
                options={assigneeFilterItems}
                value={draftAssignee}
                onChange={(next) => setDraftAssignee(String(next))}
              />
            ) : null}
          </>
        }
        onFilterApply={() =>
          setParams({
            status: draftStatus,
            priority: draftPriority,
            assignedToId: draftAssignee,
            page: "1",
          })
        }
        footer={
          data ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="tasks"
            />
          ) : undefined
        }
        columns={columns}
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        density="compact"
        activeRowId={selectedId}
        onRowClick={(row) => openTask(row)}
        getRowClassName={(row) =>
          selectedId === row.id ? WORKSPACE_ACTIVE_ROW_CLASS : undefined
        }
        emptyTitle="No tasks yet"
        emptyDescription="Create a task from a contact workspace or here."
        emptyAction={
          <Button
            variant="brand"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            New task
          </Button>
        }
        rowActions={(row) => (
            <DataTableRowActions
              actions={[
                row.status !== "COMPLETED"
                  ? {
                      label: "Mark complete",
                      onClick: () => completeMutation.mutate(row.id),
                    }
                  : {
                      label: "Reopen task",
                      onClick: () => reopenMutation.mutate(row.id),
                    },
                {
                  label: "Edit",
                  onClick: () => openTask(row),
                },
                {
                  label: "Delete",
                  onClick: () => setDeleteId(row.id),
                  destructive: true,
                },
              ]}
            />
        )}
      />
      )}

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditing(null);
            clearSelection();
          }
        }}
        task={editing}
        onSuccess={() => void invalidateTaskLists(queryClient)}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete task?"
        description="This task will be removed permanently."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </>
  );
}
