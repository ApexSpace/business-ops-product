"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/data-display/data-table";
import { StatusBadge } from "@/components/data-display/status-badge";
import {
  formatTaskDueAt,
  formatTaskPriority,
  taskPreviewText,
  taskPriorityVariant,
} from "@/features/tasks/schemas/task-profile";
import type { Task } from "@/features/tasks/types";

function assigneeLabel(task: Task): string {
  if (!task.assignedTo) return "—";
  const a = task.assignedTo;
  return [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email;
}

export function useTasksPageColumns(): DataTableColumn<Task>[] {
  return useMemo<DataTableColumn<Task>[]>(
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
}
