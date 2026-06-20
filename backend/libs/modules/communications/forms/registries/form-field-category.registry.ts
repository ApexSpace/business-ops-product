import type { FormFieldCategoryDefinition } from '../types/form-registry.types';

function cat(
  key: string,
  label: string,
  description: string,
  sortOrder: number,
  icon?: string,
): FormFieldCategoryDefinition {
  return { key, label, description, sortOrder, icon };
}

export const FORM_FIELD_CATEGORY_REGISTRY: FormFieldCategoryDefinition[] = [
  cat('basic', 'Basic', 'Common text and number inputs.', 10, 'type'),
  cat(
    'choice',
    'Choice',
    'Dropdowns, radios, checkboxes, and toggles.',
    20,
    'list-checks',
  ),
  cat(
    'datetime',
    'Date & Time',
    'Date, time, and combined date-time pickers.',
    30,
    'calendar',
  ),
  cat(
    'advanced',
    'Advanced',
    'Files, signatures, ratings, and security fields.',
    40,
    'sparkles',
  ),
  cat(
    'personal',
    'Personal',
    'Structured name and address blocks.',
    50,
    'user',
  ),
  cat(
    'layout',
    'Layout',
    'Headings, dividers, columns, and visual blocks.',
    60,
    'layout',
  ),
];

export const FORM_FIELD_CATEGORY_BY_KEY = Object.fromEntries(
  FORM_FIELD_CATEGORY_REGISTRY.map((category) => [category.key, category]),
) as Record<string, FormFieldCategoryDefinition>;

export function listFormFieldCategories(): FormFieldCategoryDefinition[] {
  return [...FORM_FIELD_CATEGORY_REGISTRY].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );
}
