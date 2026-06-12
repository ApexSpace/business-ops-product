export interface FormSubmissionFieldError {
  field: string;
  message: string;
}

const LAYOUT_TYPES = new Set([
  'heading',
  'paragraph',
  'divider',
  'spacer',
  'image',
]);

const INPUT_TYPES = new Set([
  'text',
  'email',
  'phone',
  'number',
  'password',
  'textarea',
  'select',
  'multiselect',
  'radio',
  'checkbox',
  'toggle',
  'date',
  'time',
  'datetime',
  'file',
  'signature',
  'rating',
  'range',
  'hidden',
  'captcha',
  'name',
  'address',
  'website',
]);

function isFieldObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fieldName(field: Record<string, unknown>): string | null {
  const name = field.name;
  return typeof name === 'string' && name.trim().length > 0 ? name.trim() : null;
}

function fieldType(field: Record<string, unknown>): string {
  return typeof field.type === 'string' ? field.type : 'text';
}

function validationRules(field: Record<string, unknown>): Record<string, unknown> {
  const validation = field.validation;
  return isFieldObject(validation) ? validation : {};
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'boolean') return value === false;
  return false;
}

function asString(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(asString(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function defaultRequiredMessage(field: Record<string, unknown>): string {
  const rules = validationRules(field);
  if (typeof rules.customMessage === 'string' && rules.customMessage.trim()) {
    return rules.customMessage.trim();
  }
  const label = typeof field.label === 'string' ? field.label : 'This field';
  return `${label} is required`;
}

function expandCompositeField(
  field: Record<string, unknown>,
): Array<{ key: string; label: string; type: string; required?: boolean }> {
  const base = fieldName(field);
  if (!base) return [];

  const type = fieldType(field);
  if (type === 'name') {
    const parts: Array<{ key: string; label: string; type: string; required?: boolean }> = [];
    if (field.showFirstName !== false) {
      parts.push({ key: `${base}_first`, label: 'First name', type: 'text' });
    }
    if (field.showMiddleName) {
      parts.push({ key: `${base}_middle`, label: 'Middle name', type: 'text' });
    }
    if (field.showLastName !== false) {
      parts.push({ key: `${base}_last`, label: 'Last name', type: 'text' });
    }
    return parts;
  }

  if (type === 'address') {
    return [
      { key: `${base}_street`, label: 'Street address', type: 'text' },
      { key: `${base}_city`, label: 'City', type: 'text' },
      { key: `${base}_state`, label: 'State', type: 'text' },
      { key: `${base}_zip`, label: 'ZIP code', type: 'text' },
      { key: `${base}_country`, label: 'Country', type: 'text' },
    ];
  }

  return [];
}

export function flattenSubmissionFields(
  fields: unknown[],
): Array<Record<string, unknown>> {
  const flattened: Array<Record<string, unknown>> = [];

  const walk = (items: unknown[]) => {
    for (const item of items) {
      if (!isFieldObject(item)) continue;
      const type = fieldType(item);

      if (type === 'columns' && Array.isArray(item.columns)) {
        for (const column of item.columns) {
          if (Array.isArray(column)) walk(column);
        }
        continue;
      }

      if (LAYOUT_TYPES.has(type)) continue;

      if (type === 'name' || type === 'address') {
        const base = fieldName(item);
        if (!base) continue;
        const rules = validationRules(item);
        const required = !!rules.required;
        for (const part of expandCompositeField(item)) {
          flattened.push({
            id: `${String(item.id ?? base)}_${part.key}`,
            type: part.type,
            label: part.label,
            name: part.key,
            validation: required ? { required: true, ...rules } : rules,
          });
        }
        continue;
      }

      if (!INPUT_TYPES.has(type)) continue;
      flattened.push(item);
    }
  };

  walk(fields);
  return flattened;
}

function validateFieldValue(
  field: Record<string, unknown>,
  value: unknown,
): string | null {
  const rules = validationRules(field);
  const type = fieldType(field);
  const label = typeof field.label === 'string' ? field.label : 'This field';
  const required = !!rules.required;

  if (required && isEmptyValue(value)) {
    return defaultRequiredMessage(field);
  }

  if (isEmptyValue(value)) {
    return null;
  }

  if (type === 'checkbox' || type === 'multiselect') {
    const values = Array.isArray(value) ? value : [value];
    if (required && values.length === 0) {
      return defaultRequiredMessage(field);
    }
    return null;
  }

  if (type === 'toggle') {
    return null;
  }

  const stringValue = asString(value);

  if (typeof rules.minLength === 'number' && stringValue.length < rules.minLength) {
    return `${label} must be at least ${rules.minLength} characters`;
  }

  if (typeof rules.maxLength === 'number' && stringValue.length > rules.maxLength) {
    return `${label} must be at most ${rules.maxLength} characters`;
  }

  if (type === 'number' || type === 'range' || type === 'rating') {
    const numeric = asNumber(value);
    if (numeric === null) {
      return `${label} must be a number`;
    }
    if (typeof rules.min === 'number' && numeric < rules.min) {
      return `${label} must be at least ${rules.min}`;
    }
    if (typeof rules.max === 'number' && numeric > rules.max) {
      return `${label} must be at most ${rules.max}`;
    }
    return null;
  }

  if (typeof rules.min === 'number' || typeof rules.max === 'number') {
    const numeric = asNumber(value);
    if (numeric !== null) {
      if (typeof rules.min === 'number' && numeric < rules.min) {
        return `${label} must be at least ${rules.min}`;
      }
      if (typeof rules.max === 'number' && numeric > rules.max) {
        return `${label} must be at most ${rules.max}`;
      }
    }
  }

  if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)) {
    return `${label} must be a valid email address`;
  }

  if (type === 'website') {
    try {
      const url = new URL(
        stringValue.startsWith('http') ? stringValue : `https://${stringValue}`,
      );
      if (!url.hostname) {
        return `${label} must be a valid URL`;
      }
    } catch {
      return `${label} must be a valid URL`;
    }
  }

  if (typeof rules.pattern === 'string' && rules.pattern.length > 0) {
    try {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(stringValue)) {
        return typeof rules.patternMessage === 'string' && rules.patternMessage.trim()
          ? rules.patternMessage.trim()
          : `${label} is invalid`;
      }
    } catch {
      /* ignore invalid patterns */
    }
  }

  if (type === 'select' || type === 'radio') {
    const options = Array.isArray(field.options) ? field.options : [];
    const allowed = new Set(
      options
        .filter(isFieldObject)
        .map((option) => asString(option.value || option.label))
        .filter(Boolean),
    );
    if (allowed.size > 0 && !allowed.has(stringValue)) {
      return `${label} has an invalid selection`;
    }
  }

  return null;
}

export function validateFormSubmission(
  fields: unknown[],
  data: Record<string, unknown>,
): FormSubmissionFieldError[] {
  const errors: FormSubmissionFieldError[] = [];
  const inputFields = flattenSubmissionFields(fields);

  for (const field of inputFields) {
    const name = fieldName(field);
    if (!name) continue;

    const type = fieldType(field);
    let value: unknown = data[name];

    if (type === 'hidden' && isEmptyValue(value)) {
      value = field.hiddenValue ?? field.defaultValue ?? '';
    }

    if (type === 'checkbox') {
      const options = Array.isArray(field.options) ? field.options : [];
      if (options.length > 0) {
        value = options
          .filter(isFieldObject)
          .map((option) => asString(option.value || option.label))
          .filter((optionValue) => {
            const key = `${name}.${optionValue}`;
            const raw = data[key] ?? data[optionValue];
            return raw === true || raw === 'true' || raw === 'on' || raw === optionValue;
          });
      } else {
        value = value === true || value === 'true' || value === 'on';
      }
    }

    if (type === 'multiselect') {
      value = Array.isArray(value) ? value : value === undefined ? [] : [value];
    }

    if (type === 'toggle') {
      value = value === true || value === 'true' || value === 'on';
    }

    const message = validateFieldValue(field, value);
    if (message) {
      errors.push({ field: name, message });
    }
  }

  return errors;
}

export function sanitizeFormSubmissionData(
  fields: unknown[],
  data: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const inputFields = flattenSubmissionFields(fields);

  for (const field of inputFields) {
    const name = fieldName(field);
    if (!name) continue;

    const type = fieldType(field);
    let value: unknown = data[name];

    if (type === 'hidden') {
      sanitized[name] = asString(value || field.hiddenValue || field.defaultValue || '');
      continue;
    }

    if (type === 'checkbox') {
      const options = Array.isArray(field.options) ? field.options : [];
      if (options.length > 0) {
        sanitized[name] = options
          .filter(isFieldObject)
          .map((option) => asString(option.value || option.label))
          .filter((optionValue) => {
            const key = `${name}.${optionValue}`;
            const raw = data[key] ?? data[optionValue];
            return raw === true || raw === 'true' || raw === 'on' || raw === optionValue;
          });
      } else {
        sanitized[name] = value === true || value === 'true' || value === 'on';
      }
      continue;
    }

    if (type === 'multiselect') {
      sanitized[name] = Array.isArray(value)
        ? value.map((item) => asString(item)).filter(Boolean)
        : isEmptyValue(value)
          ? []
          : [asString(value)];
      continue;
    }

    if (type === 'toggle') {
      sanitized[name] = value === true || value === 'true' || value === 'on';
      continue;
    }

    if (type === 'number' || type === 'range' || type === 'rating') {
      const numeric = asNumber(value);
      sanitized[name] = numeric === null ? asString(value) : numeric;
      continue;
    }

    sanitized[name] = asString(value);
  }

  return sanitized;
}
