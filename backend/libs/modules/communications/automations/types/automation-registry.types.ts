import type { z } from 'zod';

export type ImplementationStatus = 'implemented' | 'planned' | 'stub';

export type AutomationCategoryKey =
  | 'contact'
  | 'lead'
  | 'appointment'
  | 'calendar'
  | 'conversation'
  | 'form'
  | 'estimate'
  | 'invoice'
  | 'payment'
  | 'task'
  | 'work_item'
  | 'note'
  | 'service'
  | 'integration'
  | 'schedule'
  | 'workflow'
  | 'communication'
  | 'business'
  | 'user'
  | 'ai_agent'
  | 'finance'
  | 'contact_history';

export type AutomationCategoryScope =
  | 'trigger'
  | 'action'
  | 'custom_value'
  | 'condition';

export interface AutomationCategoryDefinition {
  key: AutomationCategoryKey;
  label: string;
  description: string;
  icon?: string;
  sortOrder: number;
  scopes: AutomationCategoryScope[];
}

export type SubjectType =
  | 'contact'
  | 'lead'
  | 'appointment'
  | 'calendar'
  | 'conversation'
  | 'form'
  | 'estimate'
  | 'invoice'
  | 'payment'
  | 'task'
  | 'work_item'
  | 'note'
  | 'integration'
  | 'schedule'
  | 'business';

export type ContextEntityType =
  | 'contact'
  | 'appointment'
  | 'invoice'
  | 'estimate'
  | 'payment'
  | 'form_submission'
  | 'conversation'
  | 'task'
  | 'work_item'
  | 'note'
  | 'lead'
  | 'calendar';

export interface TriggerFilterField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'uuid' | 'date';
  enumValues?: string[];
}

export interface TriggerDefinition {
  key: string;
  category: AutomationCategoryKey;
  label: string;
  description: string;
  icon?: string;
  implementationStatus: ImplementationStatus;
  /** Required when implementationStatus is `implemented`. */
  auditAction?: string;
  subjectType: SubjectType;
  contextEntityTypes?: ContextEntityType[];
  filterFields?: TriggerFilterField[];
  payloadSchema: z.ZodTypeAny;
  availableCustomValueCategories?: AutomationCategoryKey[];
}

export interface ActionDefinition {
  key: string;
  category: AutomationCategoryKey;
  label: string;
  description: string;
  icon?: string;
  implementationStatus: ImplementationStatus;
  configSchema: z.ZodTypeAny;
  requiredContext?: string[];
  isTerminal?: boolean;
}

export interface CustomValueDefinition {
  key: string;
  category: AutomationCategoryKey;
  label: string;
  description: string;
  example?: string;
  resolver: string;
  implementationStatus: ImplementationStatus;
}

export type ConditionValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'uuid'
  | 'tag'
  | 'enum';

export interface ConditionDefinition {
  key: string;
  category: AutomationCategoryKey;
  label: string;
  description: string;
  valueType: ConditionValueType;
  enumValues?: string[];
  implementationStatus: ImplementationStatus;
}

export type FilterOperatorKey =
  | 'eq'
  | 'neq'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'exists'
  | 'gt'
  | 'lt';

export interface FilterOperatorDefinition {
  key: FilterOperatorKey;
  label: string;
  description: string;
  supportedValueTypes: ConditionValueType[];
}
