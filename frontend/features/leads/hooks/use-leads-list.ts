"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  listLeads,
  type LeadsListFilters,
} from "@/features/leads/api/leads.api";
import { queryKeys } from "@/lib/query/keys";

export function useLeadsList(filters: LeadsListFilters) {
  return useQuery({
    queryKey: queryKeys.leads.list(filters),
    queryFn: () => listLeads(filters),
    placeholderData: keepPreviousData,
  });
}
