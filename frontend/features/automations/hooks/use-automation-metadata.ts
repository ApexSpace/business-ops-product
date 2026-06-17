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
  return useQuery({
    queryKey: queryKeys.automations.categories(scope),
    queryFn: () => listAutomationCategories(scope),
    staleTime: 5 * 60_000,
  });
}

export function useAutomationTriggers(filters?: AutomationMetadataFilters) {
  return useQuery({
    queryKey: queryKeys.automations.triggers(metadataFilters(filters)),
    queryFn: () => listAutomationTriggers(filters),
    staleTime: 5 * 60_000,
  });
}

export function useAutomationActions(filters?: AutomationMetadataFilters) {
  return useQuery({
    queryKey: queryKeys.automations.actions(metadataFilters(filters)),
    queryFn: () => listAutomationActions(filters),
    staleTime: 5 * 60_000,
  });
}

export function useAutomationCustomValues(filters?: AutomationMetadataFilters) {
  return useQuery({
    queryKey: queryKeys.automations.customValues(metadataFilters(filters)),
    queryFn: () => listAutomationCustomValuesGrouped(filters),
    staleTime: 5 * 60_000,
  });
}

export function useAutomationConditions(filters?: AutomationMetadataFilters) {
  return useQuery({
    queryKey: queryKeys.automations.conditions(metadataFilters(filters)),
    queryFn: () => listAutomationConditions(filters),
    staleTime: 5 * 60_000,
  });
}

export function useAutomationFilterOperators() {
  return useQuery({
    queryKey: queryKeys.automations.filterOperators(),
    queryFn: () => listAutomationFilterOperators(),
    staleTime: 5 * 60_000,
  });
}
