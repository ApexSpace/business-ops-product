import { FORM_FIELD_BY_KEY, FORM_FIELD_REGISTRY } from './form-field.registry';

/** Field types that collect submission values (excludes pure layout blocks). */
export const FORM_SUBMISSION_INPUT_KEYS = new Set(
  FORM_FIELD_REGISTRY.filter((field) => field.countsAsInput).map(
    (field) => field.key,
  ),
);

/** Layout blocks skipped during submission flattening (columns handled separately). */
export const FORM_SUBMISSION_LAYOUT_SKIP_KEYS = new Set(
  FORM_FIELD_REGISTRY.filter(
    (field) => field.role === 'layout' && field.key !== 'columns',
  ).map((field) => field.key),
);

/** Composite fields expanded into multiple submission inputs. */
export const FORM_COMPOSITE_FIELD_KEYS = new Set(
  FORM_FIELD_REGISTRY.filter((field) => field.role === 'composite').map(
    (field) => field.key,
  ),
);

export const FORM_CHOICE_FIELD_KEYS = new Set(
  FORM_FIELD_REGISTRY.filter((field) => field.supportsOptions).map(
    (field) => field.key,
  ),
);

export const FORM_LAYOUT_FIELD_KEYS = new Set(
  FORM_FIELD_REGISTRY.filter((field) => field.role === 'layout').map(
    (field) => field.key,
  ),
);

export const FORM_FIELD_TYPE_KEYS = FORM_FIELD_REGISTRY.map(
  (field) => field.key,
);

export function assertRegistryIntegrity(): void {
  const keys = new Set<string>();
  for (const field of FORM_FIELD_REGISTRY) {
    if (keys.has(field.key)) {
      throw new Error(`Duplicate form field registry key: ${field.key}`);
    }
    keys.add(field.key);
    if (!FORM_FIELD_BY_KEY[field.key]) {
      throw new Error(`Missing form field registry lookup: ${field.key}`);
    }
  }
}

assertRegistryIntegrity();
