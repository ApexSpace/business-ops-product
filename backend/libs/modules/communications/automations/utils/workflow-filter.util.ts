import type { WorkflowTriggerFilter } from '../types/workflow.types';

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function compareValues(
  operator: string,
  actual: unknown,
  expected: unknown,
): boolean {
  switch (operator) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'contains':
      return (
        typeof actual === 'string' &&
        typeof expected === 'string' &&
        actual.toLowerCase().includes(expected.toLowerCase())
      );
    case 'in':
      return Array.isArray(expected) ? expected.includes(actual) : false;
    case 'not_in':
      return Array.isArray(expected) ? !expected.includes(actual) : true;
    case 'exists':
      return actual !== undefined && actual !== null && actual !== '';
    case 'gt':
      return Number(actual) > Number(expected);
    case 'lt':
      return Number(actual) < Number(expected);
    default:
      return true;
  }
}

export function evaluateWorkflowTriggerFilters(
  filters: WorkflowTriggerFilter[] | null | undefined,
  metadata: Record<string, unknown> | undefined,
): boolean {
  if (!filters?.length) return true;
  const source = metadata ?? {};

  return filters.every((filter) => {
    const actual =
      source[filter.fieldKey] ??
      (filter.fieldKey.includes('.')
        ? filter.fieldKey
            .split('.')
            .reduce<unknown>(
              (acc, key) =>
                acc && typeof acc === 'object'
                  ? (acc as Record<string, unknown>)[key]
                  : undefined,
              source,
            )
        : undefined);

    if (filter.operator === 'exists') {
      return compareValues(filter.operator, actual, filter.value);
    }

    return compareValues(filter.operator, actual, filter.value);
  });
}

export function resolveFilterFieldValue(
  fieldKey: string,
  metadata: Record<string, unknown> | undefined,
): unknown {
  if (!metadata) return undefined;
  if (fieldKey in metadata) return metadata[fieldKey];
  return asString(metadata[fieldKey]);
}
