"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  Settings2,
  Trash2,
} from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";
import type { FormField, FormSettings } from "@/features/forms/types";
import {
  getFieldLayoutClassName,
  getFieldMarginStyle,
  getFieldSizeStyle,
} from "@/features/forms/utils/field-style.util";
import { FieldRenderer } from "@/features/forms/components/builder/field-renderer";
import { formFieldContainsId } from "@/features/forms/utils/form-field-contains-id.util";
import { getColumnFieldRemovalContext } from "@/features/forms/utils/column-fields.util";

interface SortableFieldRowProps {
  field: FormField;
  allFields: FormField[];
  settings: FormSettings;
  selected: boolean;
  selectedFieldId: string | null;
  isFirst: boolean;
  isLast: boolean;
  showRequiredIndicator: boolean;
  isDraggingFromPalette?: boolean;
  activeColumnTargetIndex?: number | null;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemoveField: (fieldId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onOpenSettings: () => void;
  onSelectNestedField?: (fieldId: string) => void;
}

const chromeVisibilityClass =
  "pointer-events-none opacity-0 transition-opacity group-hover:pointer-events-auto group-focus-within:pointer-events-auto group-hover:opacity-100 group-focus-within:opacity-100 group-data-[selected=true]:pointer-events-auto group-data-[selected=true]:opacity-100";

export function SortableFieldRow({
  field,
  allFields,
  settings,
  selected,
  selectedFieldId,
  isFirst,
  isLast,
  showRequiredIndicator,
  isDraggingFromPalette = false,
  activeColumnTargetIndex = null,
  onSelect,
  onDuplicate,
  onRemoveField,
  onMoveUp,
  onMoveDown,
  onOpenSettings,
  onSelectNestedField,
}: SortableFieldRowProps) {
  const isRowSelected = selected || formFieldContainsId(field, selectedFieldId);
  const nestedSelectionActive =
    selectedFieldId != null &&
    selectedFieldId !== field.id &&
    formFieldContainsId(field, selectedFieldId);
  const deleteTargetId = nestedSelectionActive ? selectedFieldId : field.id;
  const columnRemovalContext = nestedSelectionActive
    ? getColumnFieldRemovalContext(allFields, selectedFieldId)
    : null;
  const canDelete = nestedSelectionActive
    ? (columnRemovalContext?.canRemove ?? false)
    : true;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id, data: { source: "canvas" as const, fieldId: field.id } });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...getFieldMarginStyle(field.style),
      }}
      className={cn("group relative w-full pt-8", isDragging && "z-10")}
      data-selected={isRowSelected ? "true" : undefined}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        className={cn(
          "absolute right-2 top-0 z-20 flex items-center gap-px rounded-md border bg-card p-0.5 shadow-sm",
          chromeVisibilityClass,
        )}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <IconButton
          aria-label="Move field up"
          className="size-7"
          disabled={isFirst}
          onClick={(event) => {
            event.stopPropagation();
            onMoveUp();
          }}
        >
          <ArrowUp className="size-3.5" />
        </IconButton>
        <IconButton
          aria-label="Move field down"
          className="size-7"
          disabled={isLast}
          onClick={(event) => {
            event.stopPropagation();
            onMoveDown();
          }}
        >
          <ArrowDown className="size-3.5" />
        </IconButton>
        <IconButton
          aria-label="Duplicate field"
          className="size-7"
          onClick={(event) => {
            event.stopPropagation();
            onDuplicate();
          }}
        >
          <Copy className="size-3.5" />
        </IconButton>
        <IconButton
          aria-label="Field settings"
          className="size-7"
          onClick={(event) => {
            event.stopPropagation();
            onOpenSettings();
          }}
        >
          <Settings2 className="size-3.5" />
        </IconButton>
        <IconButton
          aria-label={nestedSelectionActive ? "Delete selected field" : "Remove field"}
          className="size-7 text-destructive hover:text-destructive"
          disabled={!canDelete}
          onClick={(event) => {
            event.stopPropagation();
            onRemoveField(deleteTargetId);
          }}
        >
          <Trash2 className="size-3.5" />
        </IconButton>
      </div>

      <div
        style={getFieldSizeStyle(field.style)}
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-card p-5 transition-colors",
          getFieldLayoutClassName(field.style),
          isRowSelected ? "border-primary ring-2 ring-primary/30" : "border-border",
          isDragging && "opacity-80 shadow-md",
        )}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        role="button"
        tabIndex={0}
      >
        <button
          type="button"
          className={cn(
            "shrink-0 self-center cursor-grab touch-none text-muted-foreground hover:text-foreground",
            chromeVisibilityClass,
            isDragging && "cursor-grabbing",
          )}
          aria-label="Drag to reorder"
          onClick={(event) => event.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <div className="min-w-0 flex-1">
          <FieldRenderer
            field={field}
            settings={settings}
            showRequiredIndicator={showRequiredIndicator}
            mode="builder"
            embedInBuilderRow
            selectedFieldId={selectedFieldId}
            onSelectField={onSelectNestedField}
            isDraggingFromPalette={isDraggingFromPalette}
            activeColumnTargetIndex={activeColumnTargetIndex}
          />
        </div>
      </div>
    </div>
  );
}
