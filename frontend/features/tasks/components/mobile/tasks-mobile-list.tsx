"use client";

import { Plus } from "lucide-react";
import { MobileEntityList } from "@/components/mobile/mobile-entity-list";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Button } from "@/components/ui/button";
import {
  formatTaskDueAt,
  formatTaskPriority,
} from "@/features/tasks/schemas/task-profile";
import type { Task } from "@/features/tasks/types";

export interface TasksMobileListProps {
  tasks: Task[];
  isLoading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (task: Task) => void;
  onCreate: () => void;
  pagination?: {
    meta: { total: number; page: number; limit: number };
    page: number;
    onPageChange: (page: number) => void;
  };
}

export function TasksMobileList({
  tasks,
  isLoading = false,
  search,
  onSearchChange,
  selectedId,
  onSelect,
  onCreate,
  pagination,
}: TasksMobileListProps) {
  return (
    <MobileEntityList
      title="Tasks"
      items={tasks}
      getId={(row) => row.id}
      getRow={(row) => {
        const due = formatTaskDueAt(row.dueAt);
        const priority = row.priority ? formatTaskPriority(row.priority) : null;
        return {
          primary: row.title,
          meta: priority ? `${due} · ${priority}` : due,
          status: <StatusBadge status={row.status} domain="task" />,
          ariaLabel: row.title,
        };
      }}
      selectedId={selectedId}
      onSelect={onSelect}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search tasks…"
      showFilter={false}
      onCreate={onCreate}
      createLabel="New task"
      canCreate
      isLoading={isLoading}
      loadingMessage="Loading tasks…"
      emptyTitle="No tasks yet"
      emptyDescription="Create a task from a contact workspace or here."
      emptyAction={
        <Button size="sm" onClick={onCreate}>
          <Plus className="mr-1.5 size-4" />
          New task
        </Button>
      }
      pagination={
        pagination && tasks.length > 0
          ? { ...pagination, label: "tasks" }
          : undefined
      }
    />
  );
}
