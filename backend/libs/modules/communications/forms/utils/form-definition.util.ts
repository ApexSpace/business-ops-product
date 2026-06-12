import { randomUUID } from 'crypto';
import { Form, Prisma } from '@prisma/client';

export interface FormDefinitionView {
  fields: unknown[];
  settings: Record<string, unknown>;
}

const DEFAULT_SETTINGS: Record<string, unknown> = {
  title: '',
  submitButtonLabel: 'Submit',
  successMessage: 'Thank you for your submission.',
  showRequiredIndicator: true,
};

export function defaultFormDefinition(name: string): FormDefinitionView {
  return {
    fields: [
      {
        id: randomUUID(),
        type: 'text',
        label: 'Text',
        name: 'text',
        validation: {},
        style: {
          labelPosition: 'top',
          labelSize: 'sm',
          inputSize: 'md',
          width: 100,
        },
      },
    ],
    settings: {
      ...DEFAULT_SETTINGS,
      title: name,
    },
  };
}

function isFieldObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPersistableField(value: unknown): value is Record<string, unknown> {
  if (!isFieldObject(value)) {
    return false;
  }
  const id = value.id;
  const type = value.type;
  return typeof id === 'string' && id.length > 0 && typeof type === 'string';
}

/** Drop column arrays / other invalid entries mistakenly stored at the top level. */
export function sanitizeFormFields(fields: unknown[]): unknown[] {
  if (!Array.isArray(fields)) {
    return [];
  }

  const sanitized: unknown[] = [];

  for (const item of fields) {
    if (!isPersistableField(item)) {
      continue;
    }

    const field = { ...item };
    if (field.type === 'columns' && Array.isArray(field.columns)) {
      field.columns = field.columns.map((column) =>
        Array.isArray(column) ? sanitizeFormFields(column) : [],
      );
    }

    sanitized.push(field);
  }

  return sanitized;
}

export function sanitizeFormDefinition(
  definition: FormDefinitionView,
): FormDefinitionView {
  return {
    fields: sanitizeFormFields(definition.fields),
    settings:
      definition.settings &&
      typeof definition.settings === 'object' &&
      !Array.isArray(definition.settings)
        ? { ...DEFAULT_SETTINGS, ...definition.settings }
        : { ...DEFAULT_SETTINGS },
  };
}

export function parseFormDefinition(form: Pick<Form, 'definition'>): FormDefinitionView {
  const raw = form.definition;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { fields: [], settings: { ...DEFAULT_SETTINGS } };
  }

  const obj = raw as Record<string, unknown>;
  const fields = Array.isArray(obj.fields) ? sanitizeFormFields(obj.fields) : [];
  const settings =
    obj.settings && typeof obj.settings === 'object' && !Array.isArray(obj.settings)
      ? { ...DEFAULT_SETTINGS, ...(obj.settings as Record<string, unknown>) }
      : { ...DEFAULT_SETTINGS };

  return { fields, settings };
}

export function definitionToJson(
  definition: FormDefinitionView,
): Prisma.InputJsonValue {
  return definition as unknown as Prisma.InputJsonValue;
}

/** Top-level builder rows shown on the form canvas (includes layout blocks). */
export function countFormBuilderFields(fields: unknown[]): number {
  return Array.isArray(fields) ? fields.length : 0;
}

export function countFormFields(fields: unknown[]): number {
  const inputTypes = new Set([
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

  let count = 0;
  for (const field of fields) {
    if (!field || typeof field !== 'object' || Array.isArray(field)) continue;
    const obj = field as Record<string, unknown>;
    const type = obj.type;
    if (typeof type === 'string' && inputTypes.has(type)) {
      count += 1;
    }
    if (type === 'columns' && Array.isArray(obj.columns)) {
      for (const column of obj.columns) {
        if (Array.isArray(column)) {
          count += countFormFields(column);
        }
      }
    }
  }
  return count;
}
