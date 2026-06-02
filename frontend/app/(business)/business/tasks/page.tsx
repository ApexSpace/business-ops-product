"use client";

import { Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/data-table";
import { DataTableRowActions } from "@/components/data-display/data-table-row-actions";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ConfirmDeleteDialog } from "@/components/forms/confirm-delete-dialog";
import { SearchInput } from "@/components/forms/search-input";
import { SearchableSelect } from "@/components/forms/searchable-select";
import { FilterBar } from "@/components/layout/filter-bar";
import { ListPage, ListPageSkeleton } from "@/components/layout/list-page";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { ActionButton } from "@/components/ui/action-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useListSearchParams } from "@/hooks/use-list-search-params";
import { apiClient } from "@/lib/api-client";
import { canInviteMember } from "@/lib/permissions";
import { useAuth } from "@/lib/auth-provider";
import {
  formatTaskDueAt,
  formatTaskPriority,
  taskPreviewText,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  taskPriorityVariant,
} from "@/lib/task-profile";
import { invalidateTaskLists } from "@/lib/query-invalidation";
import { queryKeys } from "@/lib/query-keys";
import type {
  BusinessMember,
  PaginatedResult,
  Task,
} from "@/types/api";

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

function assigneeLabel(task: Task): string {
  if (!task.assignedTo) return "—";
  const a = task.assignedTo;
  return [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email;
}

function BusinessTasksPageContent() {
  const queryClient = useQueryClient();
  const { jwt, contexts } = useAuth();
  const canAssign = canInviteMember(jwt, contexts);
  const { params, page, setParams } = useListSearchParams(LIST_SCHEMA);
  const debouncedSearch = useDebouncedValue(params.search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listFilters = {
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
    status: params.status || undefined,
    priority: params.priority || undefined,
    assignedToId: params.assignedToId || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.tasks.list(listFilters),
    queryFn: () =>
      apiClient<PaginatedResult<Task>>("tasks", {
        searchParams: {
          page,
          limit: PAGE_LIMIT,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(params.status ? { status: params.status } : {}),
          ...(params.priority ? { priority: params.priority } : {}),
          ...(params.assignedToId
            ? { assignedToId: params.assignedToId }
            : {}),
        },
      }),
  });

  const { data: members } = useQuery({
    queryKey: queryKeys.business.members({ page: 1, limit: 100 }),
    queryFn: () =>
      apiClient<PaginatedResult<BusinessMember>>("businesses/current/members", {
        searchParams: { page: 1, limit: 100 },
      }),
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
    mutationFn: (id: string) =>
      apiClient(`tasks/${id}`, {
        method: "DELETE",
        searchParams: { confirm: true },
      }),
    onSuccess: () => {
      toast.success("Task deleted");
      void invalidateTaskLists(queryClient);
      setDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient<Task>(`tasks/${id}/complete`, { method: "PATCH" }),
    onSuccess: () => {
      toast.success("Task completed");
      void invalidateTaskLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const reopenMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient<Task>(`tasks/${id}/reopen`, { method: "PATCH" }),
    onSuccess: () => {
      toast.success("Task reopened");
      void invalidateTaskLists(queryClient);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns = useMemo<DataTableColumn<Task>[]>(
    () => [
      {
        id: "title",
        header: "Title",
        cell: (row) => <span className="font-medium">{row.title}</span>,
      },
      {
        id: "due",
        header: "Due",
        cell: (row) => formatTaskDueAt(row.dueAt),
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => (
          <StatusBadge status={row.status} domain="task" />
        ),
      },
      {
        id: "priority",
        header: "Priority",
        cell: (row) =>
          row.priority ? (
            <Badge variant={taskPriorityVariant(row.priority)}>
              {formatTaskPriority(row.priority)}
            </Badge>
          ) : (
            "—"
          ),
      },
      {
        id: "link",
        header: "Linked to",
        cell: (row) => row.contact?.label ?? row.lead?.title ?? "—",
      },
      {
        id: "assignee",
        header: "Assigned",
        cell: (row) => assigneeLabel(row),
      },
      {
        id: "preview",
        header: "Preview",
        cell: (row) => (
          <span className="line-clamp-2 text-muted-foreground">
            {taskPreviewText(row) || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <ListPage
        title="Tasks"
        description="Follow-up actions with due dates, linked to contacts and leads."
        actions={
          <ActionButton
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 size-4" />
            New task
          </ActionButton>
        }
        filters={
          <FilterBar>
            <SearchInput
              value={params.search}
              onChange={(search) => setParams({ search, page: "1" })}
              placeholder="Search tasks…"
              className="max-w-xs"
            />
            <SearchableSelect
              items={statusFilterItems}
              value={params.status}
              onValueChange={(status) =>
                setParams({ status: status ?? "", page: "1" })
              }
              placeholder="Status"
              triggerClassName="w-[9.5rem] shrink-0"
            />
            <SearchableSelect
              items={priorityFilterItems}
              value={params.priority}
              onValueChange={(priority) =>
                setParams({ priority: priority ?? "", page: "1" })
              }
              placeholder="Priority"
              triggerClassName="w-[9.5rem] shrink-0"
            />
            {canAssign ? (
              <SearchableSelect
                items={assigneeFilterItems}
                value={params.assignedToId}
                onValueChange={(assignedToId) =>
                  setParams({ assignedToId: assignedToId ?? "", page: "1" })
                }
                placeholder="Assignee"
                triggerClassName="w-[11rem] shrink-0"
              />
            ) : null}
          </FilterBar>
        }
        pagination={
          data ? (
            <ListPagination
              meta={data.meta}
              page={page}
              onPageChange={(p) => setParams({ page: String(p) })}
              label="tasks"
            />
          ) : null
        }
      >
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No tasks yet"
          emptyDescription="Create a task from a contact workspace or here."
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
                  onClick: () => {
                    setEditing(row);
                    setDialogOpen(true);
                  },
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
      </ListPage>

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
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

export default function BusinessTasksPage() {
  return (
    <Suspense fallback={<ListPageSkeleton />}>
      <BusinessTasksPageContent />
    </Suspense>
  );
}
