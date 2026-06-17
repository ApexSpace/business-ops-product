import type { FilterOperatorDefinition } from '../types/automation-registry.types';

export const FILTER_OPERATOR_REGISTRY: FilterOperatorDefinition[] = [
  {
    key: 'eq',
    label: 'Equals',
    description: 'Value must equal the specified value.',
    supportedValueTypes: ['string', 'number', 'boolean', 'uuid', 'enum', 'tag'],
  },
  {
    key: 'neq',
    label: 'Does not equal',
    description: 'Value must not equal the specified value.',
    supportedValueTypes: ['string', 'number', 'boolean', 'uuid', 'enum', 'tag'],
  },
  {
    key: 'in',
    label: 'Is one of',
    description: 'Value must be in the specified list.',
    supportedValueTypes: ['string', 'uuid', 'enum', 'tag'],
  },
  {
    key: 'not_in',
    label: 'Is not one of',
    description: 'Value must not be in the specified list.',
    supportedValueTypes: ['string', 'uuid', 'enum', 'tag'],
  },
  {
    key: 'contains',
    label: 'Contains',
    description: 'Text value must contain the specified substring.',
    supportedValueTypes: ['string'],
  },
  {
    key: 'exists',
    label: 'Exists',
    description: 'Field must be present and non-empty.',
    supportedValueTypes: ['string', 'number', 'boolean', 'uuid'],
  },
  {
    key: 'gt',
    label: 'Greater than',
    description: 'Numeric value must be greater than the specified value.',
    supportedValueTypes: ['number'],
  },
  {
    key: 'lt',
    label: 'Less than',
    description: 'Numeric value must be less than the specified value.',
    supportedValueTypes: ['number'],
  },
];

export const FILTER_OPERATOR_BY_KEY = Object.fromEntries(
  FILTER_OPERATOR_REGISTRY.map((o) => [o.key, o]),
) as Record<
  FilterOperatorDefinition['key'],
  FilterOperatorDefinition
>;
