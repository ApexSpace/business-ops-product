"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FieldType, FormField } from "@/features/forms/types";
import { useFormFieldTypes } from "@/features/forms/hooks/use-form-metadata";
import {
  COLUMN_ALLOWED_FIELD_TYPES,
  removeColumnField,
  updateColumnFieldType,
} from "@/features/forms/utils/column-fields.util";
import { getFieldTypeLabel } from "@/features/forms/utils/field-defaults.util";
import { SettingRow } from "@/features/forms/components/builder/settings-controls/setting-row";
import { SettingSelect } from "@/features/forms/components/builder/settings-controls/setting-select";

interface ColumnsFieldEditorProps {
  columns: FormField[][];
  onChange: (columns: FormField[][]) => void;
}

const FIELD_TYPE_OPTIONS = COLUMN_ALLOWED_FIELD_TYPES.map((type) => ({
  value: type,
  label: getFieldTypeLabel(type),
}));

export function ColumnsFieldEditor({ columns, onChange }: ColumnsFieldEditorProps) {
  const { data: metadata } = useFormFieldTypes({ status: "implemented" });
  const implemented = new Set(metadata?.map((field) => field.key) ?? []);

  const typeOptions = FIELD_TYPE_OPTIONS.filter(
    (option) => implemented.size === 0 || implemented.has(option.value),
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Change field types here, or add new fields from the palette on the left.
        Select a target column in the palette when adding to a columns block.
      </p>

      {columns.map((column, columnIndex) => (
        <div
          key={columnIndex}
          className="space-y-2 rounded-md border border-border/80 bg-muted/20 p-3"
        >
          <p className="text-xs font-medium text-foreground">
            Column {columnIndex + 1}
          </p>

          {column.map((nestedField, fieldIndex) => (
            <div key={nestedField.id} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <SettingRow label={fieldIndex === 0 ? "Field type" : `Field ${fieldIndex + 1}`}>
                  <SettingSelect
                    value={nestedField.type}
                    onChange={(value) =>
                      onChange(
                        updateColumnFieldType(
                          columns,
                          columnIndex,
                          fieldIndex,
                          value as FieldType,
                        ),
                      )
                    }
                    options={typeOptions}
                  />
                </SettingRow>
              </div>
              {column.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-destructive hover:text-destructive"
                  aria-label={`Remove field ${fieldIndex + 1} from column ${columnIndex + 1}`}
                  onClick={() =>
                    onChange(removeColumnField(columns, columnIndex, fieldIndex))
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
