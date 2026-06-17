import { api } from "@/lib/api/client";
import type {
  ActionMetadata,
  AutomationCategory,
  AutomationCategoryScope,
  AutomationMetadataFilters,
  ConditionMetadata,
  CustomValueMetadata,
  FilterOperatorMetadata,
  GroupedCustomValues,
  TriggerMetadata,
} from "@/features/automations/types/metadata";

function toSearchParams(filters: AutomationMetadataFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.category) params.category = filters.category;
  if (filters.categories) params.categories = filters.categories;
  if (filters.status) params.status = filters.status;
  if (filters.search?.trim()) params.search = filters.search.trim();
  return params;
}

export function listAutomationCategories(scope?: AutomationCategoryScope) {
  return api.get<AutomationCategory[]>("automations/metadata/categories", {
    searchParams: scope ? { scope } : undefined,
  });
}

export function listAutomationTriggers(filters?: AutomationMetadataFilters) {
  return api.get<TriggerMetadata[]>("automations/metadata/triggers", {
    searchParams: toSearchParams(filters),
  });
}

export function listAutomationActions(filters?: AutomationMetadataFilters) {
  return api.get<ActionMetadata[]>("automations/metadata/actions", {
    searchParams: toSearchParams(filters),
  });
}

export function listAutomationCustomValuesGrouped(
  filters?: AutomationMetadataFilters,
) {
  return api.get<GroupedCustomValues[]>(
    "automations/metadata/custom-values",
    {
      searchParams: toSearchParams(filters),
    },
  );
}

export function listAutomationCustomValuesFlat(
  filters?: AutomationMetadataFilters,
) {
  return api.get<CustomValueMetadata[]>(
    "automations/metadata/custom-values/flat",
    {
      searchParams: toSearchParams(filters),
    },
  );
}

export function listAutomationConditions(filters?: AutomationMetadataFilters) {
  return api.get<ConditionMetadata[]>("automations/metadata/conditions", {
    searchParams: toSearchParams(filters),
  });
}

export function listAutomationFilterOperators() {
  return api.get<FilterOperatorMetadata[]>(
    "automations/metadata/filter-operators",
  );
}
