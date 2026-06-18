import type { FieldType } from "@/features/forms/types";

/** Keep in sync with backend `form-field.registry.ts`. */
export const FORM_FIELD_TYPE_KEYS = [
  "text",
  "email",
  "phone",
  "number",
  "password",
  "textarea",
  "website",
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
  "name",
  "address",
  "heading",
  "paragraph",
  "divider",
  "spacer",
  "image",
  "columns",
] as const satisfies readonly FieldType[];

export const FORM_FIELD_TYPE_SET = new Set<FieldType>(FORM_FIELD_TYPE_KEYS);

export const FORM_LAYOUT_FIELD_KEYS = [
  "heading",
  "paragraph",
  "divider",
  "spacer",
  "image",
  "columns",
] as const satisfies readonly FieldType[];

export const FORM_CHOICE_FIELD_KEYS = [
  "select",
  "multiselect",
  "radio",
  "checkbox",
] as const satisfies readonly FieldType[];

export const FORM_INPUT_FIELD_KEYS = FORM_FIELD_TYPE_KEYS.filter(
  (key) => !FORM_LAYOUT_FIELD_KEYS.includes(key as (typeof FORM_LAYOUT_FIELD_KEYS)[number]),
) as FieldType[];
