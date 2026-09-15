"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  listWorkItems,
  type WorkItemsListFilters,
} from "@/features/work-items/api/work-items.api";
import { useWorkItemsHost } from "@/features/work-items/work-items-host-context";
import { queryKeys } from "@/lib/query/keys";

export function useWorkItemsList(filters: WorkItemsListFilters) {
  const { apiBase } = useWorkItemsHost();
  return useQuery({
    queryKey: queryKeys.workItems.list(apiBase, filters),
    queryFn: () => listWorkItems(filters, apiBase),
    placeholderData: keepPreviousData,
  });
}
