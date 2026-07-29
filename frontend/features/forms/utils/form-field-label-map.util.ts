import type { FormField } from "@/features/forms/types";

const LAYOUT_TYPES = new Set([
  "heading",
  "paragraph",
  "divider",
  "spacer",
  "image",
  "columns",
]);

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildFormFieldLabelMap(
  fields: FormField[],
): Map<string, string> {
  const map = new Map<string, string>();

  const walk = (items: FormField[]) => {
    for (const field of items) {
      if (field.type === "columns" && field.columns) {
        for (const column of field.columns) {
          walk(column);
        }
        continue;
      }

      if (LAYOUT_TYPES.has(field.type)) {
        continue;
      }

      if (field.type === "name") {
        const base = field.label || "Full name";
        if (field.showFirstName !== false) {
          map.set(`${field.name}_first`, `${base} — First name`);
        }
        if (field.showMiddleName) {
          map.set(`${field.name}_middle`, `${base} — Middle name`);
        }
        if (field.showLastName !== false) {
          map.set(`${field.name}_last`, `${base} — Last name`);
        }
        continue;
      }

      if (field.type === "address") {
        const base = field.label || "Address";
        for (const part of ["street", "city", "state", "zip", "country"] as const) {
          map.set(`${field.name}_${part}`, `${base} — ${capitalize(part)}`);
        }
        continue;
      }

      map.set(field.name, field.label || field.name);
    }
  };

  walk(fields);
  return map;
}

export function resolveSubmissionFieldLabel(
  fieldKey: string,
  labelMap?: Map<string, string>,
): string {
  return labelMap?.get(fieldKey) ?? fieldKey.replace(/_/g, " ");
}
