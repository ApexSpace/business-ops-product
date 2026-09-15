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

const DEFAULT_API_BASE = "automations";

function metadataPath(apiBase: string, segment: string) {
  return `${apiBase}/metadata/${segment}`;
}

function toSearchParams(filters: AutomationMetadataFilters = {}) {
  const params: Record<string, string> = {};
  if (filters.category) params.category = filters.category;
  if (filters.categories) params.categories = filters.categories;
  if (filters.status) params.status = filters.status;
  if (filters.search?.trim()) params.search = filters.search.trim();
  return params;
}

export function listAutomationCategories(
  scope?: AutomationCategoryScope,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.get<AutomationCategory[]>(metadataPath(apiBase, "categories"), {
    searchParams: scope ? { scope } : undefined,
  });
}

export function listAutomationTriggers(
  filters?: AutomationMetadataFilters,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.get<TriggerMetadata[]>(metadataPath(apiBase, "triggers"), {
    searchParams: toSearchParams(filters),
  });
}

export function listAutomationActions(
  filters?: AutomationMetadataFilters,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.get<ActionMetadata[]>(metadataPath(apiBase, "actions"), {
    searchParams: toSearchParams(filters),
  });
}

export function listAutomationCustomValuesGrouped(
  filters?: AutomationMetadataFilters,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.get<GroupedCustomValues[]>(
    metadataPath(apiBase, "custom-values"),
    {
      searchParams: toSearchParams(filters),
    },
  );
}

export function listAutomationCustomValuesFlat(
  filters?: AutomationMetadataFilters,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.get<CustomValueMetadata[]>(
    metadataPath(apiBase, "custom-values/flat"),
    {
      searchParams: toSearchParams(filters),
    },
  );
}

export function listAutomationConditions(
  filters?: AutomationMetadataFilters,
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.get<ConditionMetadata[]>(metadataPath(apiBase, "conditions"), {
    searchParams: toSearchParams(filters),
  });
}

export function listAutomationFilterOperators(
  apiBase: string = DEFAULT_API_BASE,
) {
  return api.get<FilterOperatorMetadata[]>(
    metadataPath(apiBase, "filter-operators"),
  );
}
