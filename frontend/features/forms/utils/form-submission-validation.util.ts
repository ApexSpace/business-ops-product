import type { FormField } from "@/features/forms/types";

export interface FormSubmissionFieldError {
  field: string;
  message: string;
}

const LAYOUT_TYPES = new Set([
  "heading",
  "paragraph",
  "divider",
  "spacer",
  "image",
]);

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "boolean") return value === false;
  return false;
}

function asString(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function flattenSubmissionFields(fields: FormField[]): FormField[] {
  const flattened: FormField[] = [];

  const walk = (items: FormField[]) => {
    for (const item of items) {
      if (item.type === "columns" && item.columns) {
        for (const column of item.columns) {
          walk(column);
        }
        continue;
      }
      if (LAYOUT_TYPES.has(item.type)) continue;
      if (item.type === "name") {
        const base = item.name;
        if (item.showFirstName !== false) {
          flattened.push({
            id: `${item.id}_first`,
            type: "text",
            label: "First name",
            name: `${base}_first`,
            validation: item.validation,
          });
        }
        if (item.showMiddleName) {
          flattened.push({
            id: `${item.id}_middle`,
            type: "text",
            label: "Middle name",
            name: `${base}_middle`,
            validation: item.validation,
          });
        }
        if (item.showLastName !== false) {
          flattened.push({
            id: `${item.id}_last`,
            type: "text",
            label: "Last name",
            name: `${base}_last`,
            validation: item.validation,
          });
        }
        continue;
      }
      if (item.type === "address") {
        const base = item.name;
        for (const part of ["street", "city", "state", "zip", "country"] as const) {
          flattened.push({
            id: `${item.id}_${part}`,
            type: "text",
            label: part,
            name: `${base}_${part}`,
            validation: item.validation,
          });
        }
        continue;
      }
      flattened.push(item);
    }
  };

  walk(fields);
  return flattened;
}

function validateFieldValue(field: FormField, value: unknown): string | null {
  const rules = field.validation ?? {};
  const label = field.label || "This field";
  const required = !!rules.required;

  if (required && isEmptyValue(value)) {
    return rules.customMessage || `${label} is required`;
  }
  if (isEmptyValue(value)) return null;

  const stringValue = asString(value);

  if (typeof rules.minLength === "number" && stringValue.length < rules.minLength) {
    return `${label} must be at least ${rules.minLength} characters`;
  }
  if (typeof rules.maxLength === "number" && stringValue.length > rules.maxLength) {
    return `${label} must be at most ${rules.maxLength} characters`;
  }
  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringValue)) {
    return `${label} must be a valid email address`;
  }
  if (field.type === "website") {
    try {
      const url = new URL(
        stringValue.startsWith("http") ? stringValue : `https://${stringValue}`,
      );
      if (!url.hostname) return `${label} must be a valid URL`;
    } catch {
      return `${label} must be a valid URL`;
    }
  }
  if (rules.pattern) {
    try {
      if (!new RegExp(rules.pattern).test(stringValue)) {
        return rules.patternMessage || `${label} is invalid`;
      }
    } catch {
      /* ignore invalid patterns */
    }
  }
  return null;
}

export function collectRuntimeFormData(
  form: HTMLFormElement,
  fields: FormField[],
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const field of flattenSubmissionFields(fields)) {
    const name = field.name;
    if (!name) continue;

    if (field.type === "checkbox") {
      const options = field.options ?? [];
      if (options.length > 0) {
        data[name] = options
          .map((option) => option.value || option.label)
          .filter((optionValue) => {
            const input = form.querySelector<HTMLInputElement>(
              `input[name="${name}"][value="${optionValue}"]`,
            );
            return input?.checked;
          });
      } else {
        const input = form.elements.namedItem(name) as HTMLInputElement | null;
        data[name] = !!input?.checked;
      }
      continue;
    }

    if (field.type === "multiselect") {
      const select = form.elements.namedItem(name) as HTMLSelectElement | null;
      data[name] = select
        ? Array.from(select.selectedOptions).map((option) => option.value)
        : [];
      continue;
    }

    if (field.type === "radio") {
      const checked = form.querySelector<HTMLInputElement>(
        `input[name="${name}"]:checked`,
      );
      data[name] = checked?.value ?? "";
      continue;
    }

    if (field.type === "toggle") {
      const input = form.elements.namedItem(name) as HTMLInputElement | null;
      data[name] = !!input?.checked;
      continue;
    }

    if (field.type === "hidden") {
      const input = form.elements.namedItem(name) as HTMLInputElement | null;
      data[name] = input?.value ?? field.hiddenValue ?? field.defaultValue ?? "";
      continue;
    }

    const input = form.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
      | null;
    data[name] = input?.value ?? "";
  }
  return data;
}

export function validateRuntimeFormSubmission(
  fields: FormField[],
  data: Record<string, unknown>,
): FormSubmissionFieldError[] {
  const errors: FormSubmissionFieldError[] = [];
  for (const field of flattenSubmissionFields(fields)) {
    const message = validateFieldValue(field, data[field.name]);
    if (message) {
      errors.push({ field: field.name, message });
    }
  }
  return errors;
}

export function mapSubmissionErrors(
  errors: FormSubmissionFieldError[],
): Record<string, string> {
  return Object.fromEntries(errors.map((error) => [error.field, error.message]));
}
