"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { FORMS_BUILDER_DROP_ACTIVE_CLASS } from "@/lib/design/forms-builder-tokens";
import { getColumnDropZoneId } from "@/features/forms/utils/column-fields.util";

interface ColumnDropZoneProps {
  columnsFieldId: string;
  columnIndex: number;
  isDraggingFromPalette?: boolean;
  isTargetColumn?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ColumnDropZone({
  columnsFieldId,
  columnIndex,
  isDraggingFromPalette = false,
  isTargetColumn = false,
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
        "min-w-0 rounded-[var(--radius-control)] transition-colors",
        isTargetColumn && "ring-1 ring-violet-primary-normal/25",
        isOver && FORMS_BUILDER_DROP_ACTIVE_CLASS,
        className,
      )}
    >
      {children}
      {isDraggingFromPalette ? (
        <div
          className={cn(
            "mt-2 rounded-[var(--radius-control)] border border-dashed px-2 py-2 text-center text-[11px] text-[var(--drawer-text-secondary)]",
            isOver
              ? "border-violet-primary-normal bg-violet-primary-surface text-violet-primary-normal"
              : "border-border",
          )}
        >
          Drop field in column {columnIndex + 1}
        </div>
      ) : null}
    </div>
  );
}
