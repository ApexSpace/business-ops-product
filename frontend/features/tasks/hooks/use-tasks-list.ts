"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  listTasks,
  type TasksListFilters,
} from "@/features/tasks/api/tasks.api";
import { queryKeys } from "@/lib/query/keys";

export function useTasksList(filters: TasksListFilters) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: () => listTasks(filters),
    placeholderData: keepPreviousData,
  });
}
