import type { FormField } from "@/features/forms/types";

export function formFieldContainsId(
  field: FormField,
  fieldId: string | null,
): boolean {
  if (!fieldId) return false;
  if (field.id === fieldId) return true;
  if (field.type === "columns" && field.columns) {
    return field.columns.some((column) =>
      column.some((nested) => formFieldContainsId(nested, fieldId)),
    );
  }
  return false;
}
