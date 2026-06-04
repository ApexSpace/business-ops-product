"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  listWorkItems,
  type WorkItemsListFilters,
} from "@/features/work-items/api/work-items.api";
import { queryKeys } from "@/lib/query/keys";

export function useWorkItemsList(filters: WorkItemsListFilters) {
  return useQuery({
    queryKey: queryKeys.workItems.list(filters),
    queryFn: () => listWorkItems(filters),
    placeholderData: keepPreviousData,
  });
}
