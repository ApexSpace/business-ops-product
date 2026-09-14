"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { getColumnDropZoneId } from "@/features/forms/utils/column-fields.util";
import type { FieldType } from "@/features/forms/types";
import { InsertFieldPopover } from "@/features/forms/components/builder/insert-field-popover";
import { FORMS_BUILDER_INSERT_ROW_CLASS } from "@/lib/design/forms-builder-tokens";

interface ColumnDropZoneProps {
  columnsFieldId: string;
  columnIndex: number;
  isDraggingFromPalette?: boolean;
  isTargetColumn?: boolean;
  onInsertField?: (type: FieldType) => void;
  children: React.ReactNode;
  className?: string;
}

export function ColumnDropZone({
  columnsFieldId,
  columnIndex,
  isDraggingFromPalette = false,
  isTargetColumn = false,
  onInsertField,
  children,
  className,
}: ColumnDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: getColumnDropZoneId(columnsFieldId, columnIndex),
    data: { source: "column-drop" as const, columnsFieldId, columnIndex },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-0 rounded-md transition-colors",
        isTargetColumn && "ring-1 ring-primary/25",
        isOver && "bg-primary/5 ring-2 ring-primary/40",
        className,
      )}
    >
      {children}
      {onInsertField && !isDraggingFromPalette ? (
        <div className={FORMS_BUILDER_INSERT_ROW_CLASS}>
          <InsertFieldPopover
            columnAdd
            onAddField={onInsertField}
            ariaLabel={`Add field to column ${columnIndex + 1}`}
          />
        </div>
      ) : null}
      {isDraggingFromPalette ? (
        <div
          className={cn(
            "mt-2 rounded-md border border-dashed px-2 py-2 text-center text-[11px] text-muted-foreground",
            isOver ? "border-primary/50 bg-primary/5 text-primary" : "border-border/80",
          )}
        >
          Drop field in column {columnIndex + 1}
        </div>
      ) : null}
    </div>
  );
}
