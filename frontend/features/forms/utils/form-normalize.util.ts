import type {
  FieldStyle,
  FieldType,
  FormDefinition,
  FormField,
  FormRecord,
  FormSettings,
} from "@/features/forms/types";
import {
  createDefaultField,
  createDefaultFormSettings,
  DEFAULT_FIELD_STYLE,
  getFieldTypeLabel,
} from "@/features/forms/utils/field-defaults.util";

const FIELD_TYPES = new Set<FieldType>([
  "text",
  "email",
  "phone",
  "number",
  "password",
  "textarea",
  "select",
  "multiselect",
  "radio",
  "checkbox",
  "toggle",
  "date",
  "time",
  "datetime",
  "file",
  "signature",
  "rating",
  "range",
  "hidden",
  "captcha",
  "heading",
  "paragraph",
  "divider",
  "spacer",
  "image",
  "columns",
  "name",
  "address",
  "website",
]);

function isFormFieldLike(value: unknown): value is FormField {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Top-level builder rows must be objects with id + type (label/name backfilled on normalize). */
function isPersistableFieldRow(value: unknown): value is FormField {
  if (!isFormFieldLike(value)) return false;
  const field = value as FormField;
  return (
    typeof field.id === "string" &&
    field.id.length > 0 &&
    typeof field.type === "string" &&
    FIELD_TYPES.has(field.type as FieldType)
  );
}

function coerceRawFields(fields: unknown): FormField[] {
  if (!Array.isArray(fields)) return [];
  return fields.filter(isPersistableFieldRow);
}

function resolveFieldType(type: unknown): FieldType {
  return typeof type === "string" && FIELD_TYPES.has(type as FieldType)
    ? (type as FieldType)
    : "text";
}

function resolveFieldLabel(field: FormField, type: FieldType): string {
  const trimmed = field.label?.trim();
  if (trimmed) return trimmed;
  return getFieldTypeLabel(type);
}

function resolveFieldName(field: FormField, type: FieldType, label: string): string {
  const trimmed = field.name?.trim();
  if (trimmed) return trimmed;
  return createDefaultField(type).name || label.toLowerCase().replace(/\s+/g, "_");
}

function normalizeFieldStyle(style?: FieldStyle): FieldStyle {
  const merged = { ...DEFAULT_FIELD_STYLE, ...style };
  if (style?.width === "half") merged.width = 50;
  if (style?.width === "full") merged.width = 100;
  return merged;
}

function applyTypeDefaults(type: FieldType, field: FormField): FormField {
  const typeDefaults = createDefaultField(type);
  const merged: FormField = { ...field };

  for (const key of Object.keys(typeDefaults) as (keyof FormField)[]) {
    if (key === "id" || key === "type" || key === "label" || key === "name") {
      continue;
    }
    if (merged[key] === undefined && typeDefaults[key] !== undefined) {
      Object.assign(merged, { [key]: typeDefaults[key] });
    }
  }

  return merged;
}

function normalizeField(field: FormField): FormField {
  const hasValidType =
    typeof field.type === "string" && FIELD_TYPES.has(field.type as FieldType);
  const type = hasValidType ? (field.type as FieldType) : resolveFieldType(field.type);
  const typeDefaults = createDefaultField(type);
  const label = resolveFieldLabel(field, type);
  const name = resolveFieldName(field, type, label);

  const normalized: FormField = applyTypeDefaults(type, {
    ...(hasValidType ? {} : typeDefaults),
    ...field,
    type,
    label,
    name,
    validation: { ...typeDefaults.validation, ...(field.validation ?? {}) },
    style: normalizeFieldStyle({ ...typeDefaults.style, ...field.style }),
  });

  if (type === "columns" && field.columns) {
    normalized.columns = field.columns.map((column) =>
      coerceRawFields(column).map(normalizeField),
    );
    if (field.columnCount) normalized.columnCount = field.columnCount;
  }

  return normalized;
}

export function normalizeFormField(field: FormField): FormField {
  return normalizeField(field);
}

export function normalizeFormSettings(settings: Partial<FormSettings>): FormSettings {
  return { ...createDefaultFormSettings(), ...settings };
}

export function normalizeFormDefinition(definition: FormDefinition): FormDefinition {
  return {
    fields: coerceRawFields(definition.fields).map(normalizeField),
    settings: normalizeFormSettings(definition.settings ?? {}),
  };
}

/** Canonical definition shape sent to the API on save. */
export function prepareFormDefinitionForSave(definition: FormDefinition): FormDefinition {
  return normalizeFormDefinition(definition);
}

function normalizeFormStatus(status: unknown): FormRecord["status"] {
  if (typeof status === "string") {
    const lower = status.toLowerCase();
    if (lower === "draft" || lower === "published" || lower === "archived") {
      return lower;
    }
  }
  return "draft";
}

export function normalizeFormRecord(record: FormRecord): FormRecord {
  return {
    ...record,
    status: normalizeFormStatus(record.status),
    definition: normalizeFormDefinition(record.definition ?? { fields: [], settings: {} }),
  };
}
