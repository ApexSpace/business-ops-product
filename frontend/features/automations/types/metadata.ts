export type ImplementationStatus = "implemented" | "planned" | "stub";

export type AutomationCategoryScope =
  | "trigger"
  | "action"
  | "custom_value"
  | "condition";

export interface AutomationCategory {
  key: string;
  label: string;
  description: string;
  icon?: string;
  sortOrder: number;
  scopes: AutomationCategoryScope[];
}

export interface TriggerFilterField {
  key: string;
  label: string;
  type: string;
  enumValues?: string[];
}

export interface TriggerMetadata {
  key: string;
  category: string;
  label: string;
  description: string;
  icon?: string;
  implementationStatus: ImplementationStatus;
  activatable: boolean;
  auditAction?: string;
  subjectType: string;
  contextEntityTypes?: string[];
  filterFields?: TriggerFilterField[];
  availableCustomValueCategories?: string[];
}

export interface ActionMetadata {
  key: string;
  category: string;
  label: string;
  description: string;
  icon?: string;
  implementationStatus: ImplementationStatus;
  activatable: boolean;
  requiredContext?: string[];
  isTerminal?: boolean;
}

export interface CustomValueMetadata {
  key: string;
  category: string;
  label: string;
  description: string;
  example?: string;
  mergeTag: string;
  implementationStatus: ImplementationStatus;
}

export interface GroupedCustomValues {
  category: string;
  label: string;
  items: CustomValueMetadata[];
}

export interface ConditionMetadata {
  key: string;
  category: string;
  label: string;
  description: string;
  valueType: string;
  enumValues?: string[];
  implementationStatus: ImplementationStatus;
}

export interface FilterOperatorMetadata {
  key: string;
  label: string;
  description: string;
  supportedValueTypes: string[];
}

export interface AutomationMetadataFilters {
  category?: string;
  categories?: string;
  status?: ImplementationStatus;
  search?: string;
}

export interface AutomationFilterRule {
  fieldKey: string;
  operator: string;
  value: string | number | boolean | string[];
}
