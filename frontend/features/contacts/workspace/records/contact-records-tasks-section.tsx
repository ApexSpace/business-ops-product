"use client";

import { Check, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/data-display/empty-state";
import { ActionButton } from "@/components/ui/action-button";
import { IconButton } from "@/components/ui/icon-button";
import {
  formatTaskDueAt,
  formatTaskPriority,
  formatTaskStatus,
  taskPreviewText,
} from "@/features/tasks/schemas/task-profile";
import { RecordListEmpty, RecordListItem } from "@/features/contacts/components/contact-workspace/contact-record-section";
import type { ContactRecordsSectionProps } from "@/features/contacts/workspace/records/contact-records-types";

export function ContactRecordsTasksSection({
  tasks,
  tasksLoading,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onCompleteTask,
  onReopenTask,
}: ContactRecordsSectionProps) {
  if (tasksLoading) return <RecordListEmpty message="Loading…" />;
  if (tasks.length === 0) {
    return (
      <EmptyState
        compact
        title="No tasks yet"
        description="Schedule follow-ups with due dates for this contact."
        action={
          <ActionButton onClick={onCreateTask}>
            <Plus className="mr-1.5 size-4" />
            Add task
          </ActionButton>
        }
        className="py-8"
      />
    );
  }
  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const assignee = task.assignedTo
          ? [task.assignedTo.firstName, task.assignedTo.lastName]
              .filter(Boolean)
              .join(" ") || task.assignedTo.email
          : null;
        const metaParts = [
          formatTaskDueAt(task.dueAt),
          formatTaskStatus(task.status),
          task.priority ? formatTaskPriority(task.priority) : null,
          assignee,
        ].filter(Boolean);
        return (
          <li key={task.id}>
            <RecordListItem
              title={task.title}
              meta={metaParts.join(" · ")}
              onClick={() => onEditTask(task)}
              actions={
                <>
                  {task.status !== "COMPLETED" ? (
                    <IconButton
                      aria-label="Mark complete"
                      className="size-7"
                      onClick={() => onCompleteTask(task.id)}
                    >
                      <Check className="size-3.5" />
                    </IconButton>
                  ) : (
                    <IconButton
                      aria-label="Reopen task"
                      className="size-7"
                      onClick={() => onReopenTask(task.id)}
                    >
                      <RotateCcw className="size-3.5" />
                    </IconButton>
                  )}
                  <IconButton
                    aria-label="Edit task"
                    className="size-7"
                    onClick={() => onEditTask(task)}
                  >
                    <Pencil className="size-3.5" />
                  </IconButton>
                  <IconButton
                    aria-label="Delete task"
                    className="size-7 text-destructive"
                    onClick={() => onDeleteTask(task.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </>
              }
            />
            {taskPreviewText(task) ? (
              <p className="mt-0.5 line-clamp-2 px-1 text-xs text-muted-foreground">
                {taskPreviewText(task)}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
