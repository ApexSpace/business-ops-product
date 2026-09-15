import {
  FORM_COMPOSITE_FIELD_KEYS,
  FORM_FIELD_TYPE_KEYS,
  FORM_SUBMISSION_INPUT_KEYS,
  FORM_SUBMISSION_LAYOUT_SKIP_KEYS,
} from '../registries/form-field-registry.util';
import { isKnownFormFieldType } from '../registries/form-field.registry';

describe('form field registry', () => {
  it('has unique keys with lookup entries', () => {
    const keys = new Set<string>();
    for (const key of FORM_FIELD_TYPE_KEYS) {
      expect(keys.has(key)).toBe(false);
      keys.add(key);
      expect(isKnownFormFieldType(key)).toBe(true);
    }
  });

  it('covers expected palette field counts', () => {
    expect(FORM_FIELD_TYPE_KEYS).toHaveLength(29);
    expect(FORM_SUBMISSION_INPUT_KEYS.size).toBe(23);
    expect(FORM_SUBMISSION_LAYOUT_SKIP_KEYS.size).toBe(5);
    expect(FORM_COMPOSITE_FIELD_KEYS.size).toBe(2);
  });

  it('keeps columns out of layout skip set', () => {
    expect(FORM_SUBMISSION_LAYOUT_SKIP_KEYS.has('columns')).toBe(false);
    expect(FORM_SUBMISSION_INPUT_KEYS.has('columns')).toBe(false);
  });
});
