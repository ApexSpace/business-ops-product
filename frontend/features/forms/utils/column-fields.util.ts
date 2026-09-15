import type { FieldType, FormField } from "@/features/forms/types";
import { FORM_FIELD_TYPE_KEYS } from "@/features/forms/constants/form-field-type-keys.constant";
import { createDefaultField } from "@/features/forms/utils/field-defaults.util";
import { cn } from "@/lib/utils";

/** Field types that can be placed inside a column layout. */
export const COLUMN_ALLOWED_FIELD_TYPES = FORM_FIELD_TYPE_KEYS.filter(
  (type) => type !== "columns" && type !== "hidden" && type !== "captcha",
) as FieldType[];

const COMPANION_FIELD_TYPES: FieldType[] = ["text", "number", "email"];

export function columnHasTallContent(column: FormField[]): boolean {
  return column.some(
    (field) =>
      field.type === "image" ||
      field.type === "textarea" ||
      field.type === "signature" ||
      field.type === "file",
  );
}

export function columnsContainTallContent(columns: FormField[][]): boolean {
  return columns.some(columnHasTallContent);
}

export function replaceColumnFieldType(
  columns: FormField[][],
  columnIndex: number,
  fieldIndex: number,
  type: FieldType,
): FormField[][] {
  const next = structuredClone(columns);
  const existing = next[columnIndex]?.[fieldIndex];
  if (!existing) return columns;

  const replacement = createDefaultField(type, columnIndex);
  replacement.id = existing.id;
  next[columnIndex][fieldIndex] = replacement;
  return next;
}

export function addColumnField(
  columns: FormField[][],
  columnIndex: number,
  type: FieldType = "text",
): { columns: FormField[][]; field: FormField } {
  const next = structuredClone(columns);
  if (!next[columnIndex]) return { columns, field: createDefaultField(type, columnIndex),
};
  const field = createDefaultField(type, columnIndex);
  next[columnIndex] = [...next[columnIndex], field];
  return { columns: next, field,
};
}

export function removeColumnField(
  columns: FormField[][],
  columnIndex: number,
  fieldIndex: number,
): FormField[][] {
  const next = structuredClone(columns);
  const column = next[columnIndex];
  if (!column || column.length <= 1) return columns;
  next[columnIndex] = column.filter((_, index) => index !== fieldIndex);
  return next;
}

/**
 * When a column gets a tall field (e.g. image), add compact input fields to the
 * nearest sibling column so users can stack fields beside the tall content.
 */
export function balanceColumnsForTallField(
  columns: FormField[][],
  tallColumnIndex: number,
): FormField[][] {
  const next = structuredClone(columns);
  const tallColumn = next[tallColumnIndex];
  if (!tallColumn || !columnHasTallContent(tallColumn)) return columns;

  const targetIndex = findBalanceTargetColumn(next, tallColumnIndex);
  if (targetIndex == null) return columns;

  const targetColumn = next[targetIndex];
  const hasOnlyDefaultText =
    targetColumn.length === 1 && targetColumn[0]?.type === "text";

  if (!hasOnlyDefaultText) return columns;

  next[targetIndex] = [
    targetColumn[0],
    ...COMPANION_FIELD_TYPES.slice(1).map((type) =>
      createDefaultField(type, targetIndex),
    ),
  ];
  return next;
}

function findBalanceTargetColumn(
  columns: FormField[][],
  tallColumnIndex: number,
): number | null {
  if (columns.length < 2) return null;

  const right = tallColumnIndex + 1;
  if (right < columns.length) return right;

  const left = tallColumnIndex - 1;
  if (left >= 0) return left;

  return null;
}

export function updateColumnFieldType(
  columns: FormField[][],
  columnIndex: number,
  fieldIndex: number,
  type: FieldType,
): FormField[][] {
  let next = replaceColumnFieldType(columns, columnIndex, fieldIndex, type);

  const tallTypes: FieldType[] = ["image", "textarea", "file", "signature"];
  if (tallTypes.includes(type)) {
    next = balanceColumnsForTallField(next, columnIndex);
  }

  return next;
}

export function getColumnFieldRemovalContext(
  fields: FormField[],
  fieldId: string,
): {
  columnsFieldId: string;
  columnIndex: number;
  fieldIndex: number;
  canRemove: boolean;
} | null {
  for (const field of fields) {
    if (field.type !== "columns" || !field.columns) continue;

    for (let columnIndex = 0; columnIndex < field.columns.length; columnIndex++) {
      const fieldIndex = field.columns[columnIndex].findIndex(
        (nested) => nested.id === fieldId,
      );
      if (fieldIndex >= 0) {
        return {
          columnsFieldId: field.id,
          columnIndex,
          fieldIndex,
          canRemove: field.columns[columnIndex].length > 1,
        };
      }
    }
  }

  return null;
}

export function removeNestedFieldFromColumns(
  fields: FormField[],
  fieldId: string,
): FormField[] {
  return fields.map((field) => {
    if (field.type !== "columns" || !field.columns) return field;

    const nextColumns = field.columns.map((column) => {
      if (!column.some((nested) => nested.id === fieldId)) return column;
      if (column.length <= 1) return column;
      return column.filter((nested) => nested.id !== fieldId);
    });

    return { ...field, columns: nextColumns,
};
  });
}

export function getColumnDropZoneId(
  columnsFieldId: string,
  columnIndex: number,
): string {
  return `column-drop:${columnsFieldId}:${columnIndex}`;
}

export function parseColumnDropZoneId(
  id: string,
): { columnsFieldId: string; columnIndex: number } | null {
  if (!id.startsWith("column-drop:")) return null;
  const [, columnsFieldId, columnIndexStr] = id.split(":");
  if (!columnsFieldId || columnIndexStr == null) return null;
  const columnIndex = Number(columnIndexStr);
  if (!Number.isInteger(columnIndex) || columnIndex < 0) return null;
  return { columnsFieldId, columnIndex,
};
}

export interface ColumnAddContext {
  columnsFieldId: string;
  columnCount: number;
  targetColumnIndex: number;
}

export function findColumnFieldContext(
  fields: FormField[],
  fieldId: string,
): {
  columnsField: FormField;
  columnIndex: number;
} | null {
  for (const field of fields) {
    if (field.type !== "columns" || !field.columns) continue;

    if (field.id === fieldId) {
      return { columnsField: field, columnIndex: 0,
};
    }

    for (let columnIndex = 0; columnIndex < field.columns.length; columnIndex++) {
      if (field.columns[columnIndex].some((nested) => nested.id === fieldId)) {
        return { columnsField: field, columnIndex,
};
      }
    }
  }

  return null;
}

export function resolveColumnAddContext(
  fields: FormField[],
  selectedFieldId: string | null,
  targetColumnIndex: number,
): ColumnAddContext | null {
  if (!selectedFieldId) return null;

  const context = findColumnFieldContext(fields, selectedFieldId);
  if (!context) return null;

  const columnCount =
    context.columnsField.columnCount ?? context.columnsField.columns?.length ?? 0;
  if (columnCount < 1) return null;

  const resolvedTarget =
    context.columnsField.id === selectedFieldId
      ? targetColumnIndex
      : context.columnIndex;

  return {
    columnsFieldId: context.columnsField.id,
    columnCount,
    targetColumnIndex: Math.min(Math.max(resolvedTarget, 0), columnCount - 1),
  };
}

const COLUMN_VERTICAL_ALIGN_CLASS = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
  stretch: "items-stretch",
} as const;

const COLUMN_HORIZONTAL_ALIGN_CLASS = {
  left: "justify-items-start",
  center: "justify-items-center",
  right: "justify-items-end",
} as const;

const COLUMN_INNER_HORIZONTAL_ALIGN_CLASS = {
  left: "items-start",
  center: "items-center",
  right: "items-end",
} as const;

export function getColumnLayoutClasses(field: FormField): {
  grid: string;
  column: string;
} {
  const vertical = field.columnVerticalAlign ?? "top";
  const horizontal = field.columnHorizontalAlign ?? "left";

  return {
    grid: cn(
      COLUMN_VERTICAL_ALIGN_CLASS[vertical],
      COLUMN_HORIZONTAL_ALIGN_CLASS[horizontal],
    ),
    column: cn("flex min-w-0 flex-col", COLUMN_INNER_HORIZONTAL_ALIGN_CLASS[horizontal]),
  };
}
