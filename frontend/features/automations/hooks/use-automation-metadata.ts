"use client";

import { useQuery } from "@tanstack/react-query";
import {
  listAutomationActions,
  listAutomationCategories,
  listAutomationConditions,
  listAutomationCustomValuesGrouped,
  listAutomationFilterOperators,
  listAutomationTriggers,
} from "@/features/automations/api/metadata.api";
import { useAutomationsHost } from "@/features/automations/automations-host-context";
import type { AutomationMetadataFilters } from "@/features/automations/types/metadata";
import { queryKeys, type ListFilters } from "@/lib/query/keys";

function metadataFilters(
  filters?: AutomationMetadataFilters,
): ListFilters | undefined {
  return filters as ListFilters | undefined;
}

export function useAutomationCategories(
  scope?: "trigger" | "action" | "custom_value" | "condition",
) {
  const { apiBase } = useAutomationsHost();
  return useQuery({
    queryKey: queryKeys.automations.categories(apiBase, scope),
    queryFn: () => listAutomationCategories(scope, apiBase),
    staleTime: 5 * 60_000,
  });
}

export function useAutomationTriggers(filters?: AutomationMetadataFilters) {
  const { apiBase } = useAutomationsHost();
  return useQuery({
    queryKey: queryKeys.automations.triggers(apiBase, metadataFilters(filters)),
    queryFn: () => listAutomationTriggers(filters, apiBase),
    staleTime: 5 * 60_000,
  });
}

export function useAutomationActions(filters?: AutomationMetadataFilters) {
  const { apiBase } = useAutomationsHost();
  return useQuery({
    queryKey: queryKeys.automations.actions(apiBase, metadataFilters(filters)),
    queryFn: () => listAutomationActions(filters, apiBase),
    staleTime: 5 * 60_000,
  });
}

export function useAutomationCustomValues(filters?: AutomationMetadataFilters) {
  const { apiBase } = useAutomationsHost();
  return useQuery({
    queryKey: queryKeys.automations.customValues(
      apiBase,
      metadataFilters(filters),
    ),
    queryFn: () => listAutomationCustomValuesGrouped(filters, apiBase),
    staleTime: 5 * 60_000,
  });
}

export function useAutomationConditions(filters?: AutomationMetadataFilters) {
  const { apiBase } = useAutomationsHost();
  return useQuery({
    queryKey: queryKeys.automations.conditions(
      apiBase,
      metadataFilters(filters),
    ),
    queryFn: () => listAutomationConditions(filters, apiBase),
    staleTime: 5 * 60_000,
  });
}

export function useAutomationFilterOperators() {
  const { apiBase } = useAutomationsHost();
  return useQuery({
    queryKey: queryKeys.automations.filterOperators(apiBase),
    queryFn: () => listAutomationFilterOperators(apiBase),
    staleTime: 5 * 60_000,
  });
}
