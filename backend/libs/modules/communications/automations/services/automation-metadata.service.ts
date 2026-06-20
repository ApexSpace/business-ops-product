import { Injectable } from '@nestjs/common';
import { listCategories } from '../registries/category.registry';
import { TRIGGER_REGISTRY } from '../registries/trigger.registry';
import { ACTION_REGISTRY } from '../registries/action.registry';
import { CUSTOM_VALUE_REGISTRY } from '../registries/custom-value.registry';
import { CONDITION_REGISTRY } from '../registries/condition.registry';
import { FILTER_OPERATOR_REGISTRY } from '../registries/filter-operator.registry';
import type {
  ActionDefinition,
  AutomationCategoryDefinition,
  AutomationCategoryScope,
  ConditionDefinition,
  CustomValueDefinition,
  FilterOperatorDefinition,
  ImplementationStatus,
  TriggerDefinition,
} from '../types/automation-registry.types';
import type {
  ActionMetadataResponseDto,
  AutomationCategoryResponseDto,
  ConditionMetadataResponseDto,
  CustomValueMetadataResponseDto,
  FilterOperatorMetadataResponseDto,
  GroupedCustomValuesResponseDto,
  TriggerMetadataResponseDto,
} from '../dto/automation-metadata.dto';
import { AUTOMATION_CATEGORY_BY_KEY } from '../registries/category.registry';

type MetadataFilter = {
  categoryKeys?: string[];
  status?: ImplementationStatus;
  search?: string;
};

function matchesSearch(
  label: string,
  description: string,
  search?: string,
): boolean {
  if (!search?.trim()) return true;
  const needle = search.trim().toLowerCase();
  return (
    label.toLowerCase().includes(needle) ||
    description.toLowerCase().includes(needle)
  );
}

function isActivatable(status: ImplementationStatus): boolean {
  return status === 'implemented';
}

@Injectable()
export class AutomationMetadataService {
  listCategories(
    scope?: AutomationCategoryScope,
  ): AutomationCategoryResponseDto[] {
    const categories = listCategories(scope);
    return categories.map((category) => this.toCategoryDto(category));
  }

  listTriggers(filter: MetadataFilter = {}): TriggerMetadataResponseDto[] {
    return TRIGGER_REGISTRY.filter((trigger) =>
      this.matchesTriggerFilter(trigger, filter),
    ).map((trigger) => this.toTriggerDto(trigger));
  }

  listActions(filter: MetadataFilter = {}): ActionMetadataResponseDto[] {
    return ACTION_REGISTRY.filter((action) =>
      this.matchesActionFilter(action, filter),
    ).map((action) => this.toActionDto(action));
  }

  listCustomValues(
    filter: MetadataFilter = {},
  ): CustomValueMetadataResponseDto[] {
    return CUSTOM_VALUE_REGISTRY.filter((value) =>
      this.matchesCustomValueFilter(value, filter),
    ).map((value) => this.toCustomValueDto(value));
  }

  listCustomValuesGrouped(
    filter: MetadataFilter = {},
  ): GroupedCustomValuesResponseDto[] {
    const values = this.listCustomValues(filter);
    const grouped = new Map<string, CustomValueMetadataResponseDto[]>();

    for (const value of values) {
      const bucket = grouped.get(value.category) ?? [];
      bucket.push(value);
      grouped.set(value.category, bucket);
    }

    return [...grouped.entries()]
      .map(([categoryKey, items]) => ({
        category: categoryKey,
        label:
          AUTOMATION_CATEGORY_BY_KEY[
            categoryKey as keyof typeof AUTOMATION_CATEGORY_BY_KEY
          ]?.label ?? categoryKey,
        items,
      }))
      .sort(
        (a, b) =>
          (AUTOMATION_CATEGORY_BY_KEY[
            a.category as keyof typeof AUTOMATION_CATEGORY_BY_KEY
          ]?.sortOrder ?? 999) -
          (AUTOMATION_CATEGORY_BY_KEY[
            b.category as keyof typeof AUTOMATION_CATEGORY_BY_KEY
          ]?.sortOrder ?? 999),
      );
  }

  listConditions(filter: MetadataFilter = {}): ConditionMetadataResponseDto[] {
    return CONDITION_REGISTRY.filter((condition) =>
      this.matchesConditionFilter(condition, filter),
    ).map((condition) => this.toConditionDto(condition));
  }

  listFilterOperators(): FilterOperatorMetadataResponseDto[] {
    return FILTER_OPERATOR_REGISTRY.map((operator) =>
      this.toFilterOperatorDto(operator),
    );
  }

  getCategoryTrees(): {
    triggers: AutomationCategoryResponseDto[];
    actions: AutomationCategoryResponseDto[];
    customValues: AutomationCategoryResponseDto[];
    conditions: AutomationCategoryResponseDto[];
  } {
    return {
      triggers: this.listCategories('trigger'),
      actions: this.listCategories('action'),
      customValues: this.listCategories('custom_value'),
      conditions: this.listCategories('condition'),
    };
  }

  private matchesTriggerFilter(
    trigger: TriggerDefinition,
    filter: MetadataFilter,
  ): boolean {
    if (
      filter.categoryKeys?.length &&
      !filter.categoryKeys.includes(trigger.category)
    ) {
      return false;
    }
    if (filter.status && trigger.implementationStatus !== filter.status) {
      return false;
    }
    return matchesSearch(trigger.label, trigger.description, filter.search);
  }

  private matchesActionFilter(
    action: ActionDefinition,
    filter: MetadataFilter,
  ): boolean {
    if (
      filter.categoryKeys?.length &&
      !filter.categoryKeys.includes(action.category)
    ) {
      return false;
    }
    if (filter.status && action.implementationStatus !== filter.status) {
      return false;
    }
    return matchesSearch(action.label, action.description, filter.search);
  }

  private matchesCustomValueFilter(
    value: CustomValueDefinition,
    filter: MetadataFilter,
  ): boolean {
    if (
      filter.categoryKeys?.length &&
      !filter.categoryKeys.includes(value.category)
    ) {
      return false;
    }
    if (filter.status && value.implementationStatus !== filter.status) {
      return false;
    }
    return matchesSearch(value.label, value.description, filter.search);
  }

  private matchesConditionFilter(
    condition: ConditionDefinition,
    filter: MetadataFilter,
  ): boolean {
    if (
      filter.categoryKeys?.length &&
      !filter.categoryKeys.includes(condition.category)
    ) {
      return false;
    }
    if (filter.status && condition.implementationStatus !== filter.status) {
      return false;
    }
    return matchesSearch(condition.label, condition.description, filter.search);
  }

  private toCategoryDto(
    category: AutomationCategoryDefinition,
  ): AutomationCategoryResponseDto {
    return {
      key: category.key,
      label: category.label,
      description: category.description,
      icon: category.icon,
      sortOrder: category.sortOrder,
      scopes: category.scopes,
    };
  }

  private toTriggerDto(trigger: TriggerDefinition): TriggerMetadataResponseDto {
    return {
      key: trigger.key,
      category: trigger.category,
      label: trigger.label,
      description: trigger.description,
      icon: trigger.icon,
      implementationStatus: trigger.implementationStatus,
      activatable: isActivatable(trigger.implementationStatus),
      auditAction: trigger.auditAction,
      subjectType: trigger.subjectType,
      contextEntityTypes: trigger.contextEntityTypes,
      filterFields: trigger.filterFields,
      availableCustomValueCategories: trigger.availableCustomValueCategories,
    };
  }

  private toActionDto(action: ActionDefinition): ActionMetadataResponseDto {
    return {
      key: action.key,
      category: action.category,
      label: action.label,
      description: action.description,
      icon: action.icon,
      implementationStatus: action.implementationStatus,
      activatable: isActivatable(action.implementationStatus),
      requiredContext: action.requiredContext,
      isTerminal: action.isTerminal,
    };
  }

  private toCustomValueDto(
    value: CustomValueDefinition,
  ): CustomValueMetadataResponseDto {
    return {
      key: value.key,
      category: value.category,
      label: value.label,
      description: value.description,
      example: value.example,
      mergeTag: `{{${value.key}}}`,
      implementationStatus: value.implementationStatus,
    };
  }

  private toConditionDto(
    condition: ConditionDefinition,
  ): ConditionMetadataResponseDto {
    return {
      key: condition.key,
      category: condition.category,
      label: condition.label,
      description: condition.description,
      valueType: condition.valueType,
      enumValues: condition.enumValues,
      implementationStatus: condition.implementationStatus,
    };
  }

  private toFilterOperatorDto(
    operator: FilterOperatorDefinition,
  ): FilterOperatorMetadataResponseDto {
    return {
      key: operator.key,
      label: operator.label,
      description: operator.description,
      supportedValueTypes: operator.supportedValueTypes,
    };
  }
}

/** Exported for tests — total registry counts. */
export const REGISTRY_COUNTS = {
  categories: listCategories().length,
  triggers: TRIGGER_REGISTRY.length,
  actions: ACTION_REGISTRY.length,
  customValues: CUSTOM_VALUE_REGISTRY.length,
  conditions: CONDITION_REGISTRY.length,
  filterOperators: FILTER_OPERATOR_REGISTRY.length,
};
