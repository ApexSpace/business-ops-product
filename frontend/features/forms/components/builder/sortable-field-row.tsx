"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { MoreActionsButton } from "@/components/ui/more-actions-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { FieldType, FormField, FormSettings } from "@/features/forms/types";
import { getFieldMarginStyle } from "@/features/forms/utils/field-style.util";
import { formFieldContainsId } from "@/features/forms/utils/form-field-contains-id.util";
import { getColumnFieldRemovalContext } from "@/features/forms/utils/column-fields.util";
import {
  getBuilderFieldChipLabel,
} from "@/features/forms/utils/field-defaults.util";
import { getFieldTypeIcon } from "@/features/forms/utils/field-type-icons";
import { useFormFieldTypeMap } from "@/features/forms/hooks/use-form-metadata";
import { BuilderFieldPreview } from "@/features/forms/components/builder/builder-field-preview";
import {
  FORMS_BUILDER_ACTIVE_PILL_CLASS,
  FORMS_BUILDER_CARD_CLASS,
  FORMS_BUILDER_CARD_IDLE_CLASS,
  FORMS_BUILDER_CARD_SELECTED_CLASS,
  FORMS_BUILDER_FIELD_LABEL_CLASS,
  FORMS_BUILDER_TYPE_CHIP_CLASS,
} from "@/lib/design/forms-builder-tokens";

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
  onAddFieldToColumn?: (
    columnsFieldId: string,
    columnIndex: number,
    type: FieldType,
  ) => void;
}

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
  onAddFieldToColumn,
}: SortableFieldRowProps) {
  const { byKey } = useFormFieldTypeMap({ status: "implemented" });
  const meta = byKey.get(field.type);
  const Icon = getFieldTypeIcon(field.type, meta?.icon);
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
  const required = Boolean(
    showRequiredIndicator && field.validation?.required,
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: field.id,
    data: { source: "canvas" as const, fieldId: field.id },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...getFieldMarginStyle(field.style),
      }}
      className={cn("relative w-full", isDragging && "z-10")}
      data-selected={isRowSelected ? "true" : undefined}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {isRowSelected ? (
        <span className={FORMS_BUILDER_ACTIVE_PILL_CLASS}>
          <span className="size-1.5 rounded-full bg-white" aria-hidden />
          Active Selection
        </span>
      ) : null}

      <div
        className={cn(
          FORMS_BUILDER_CARD_CLASS,
          "flex flex-col gap-[var(--spacing-2)]",
          isRowSelected
            ? FORMS_BUILDER_CARD_SELECTED_CLASS
            : FORMS_BUILDER_CARD_IDLE_CLASS,
          isDragging && "opacity-80",
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
        <div className="flex items-start gap-[var(--spacing-2)]">
          <button
            type="button"
            className={cn(
              "mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground",
              isDragging && "cursor-grabbing",
            )}
            aria-label="Drag to reorder"
            onClick={(event) => event.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[var(--spacing-2)]">
            <span className={FORMS_BUILDER_TYPE_CHIP_CLASS}>
              <Icon className="size-3 shrink-0" />
              <span className="truncate">{getBuilderFieldChipLabel(field.type)}</span>
            </span>
            <span className={cn(FORMS_BUILDER_FIELD_LABEL_CLASS, "min-w-0 truncate")}>
              {field.label || "Untitled field"}
              {required ? <span className="text-destructive"> *</span> : null}
            </span>
          </div>

          <div
            className="flex shrink-0 items-center"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {isRowSelected ? (
              <>
                <IconButton
                  aria-label="Duplicate field"
                  className="size-8"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDuplicate();
                  }}
                >
                  <Copy className="size-3.5" />
                </IconButton>
                <IconButton
                  aria-label={
                    nestedSelectionActive
                      ? "Delete selected field"
                      : "Remove field"
                  }
                  className="size-8 text-destructive hover:text-destructive"
                  disabled={!canDelete}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveField(deleteTargetId);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              </>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<MoreActionsButton aria-label="Field actions" />}
              />
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => {
                    onSelect();
                    onOpenSettings();
                  }}
                >
                  Edit settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>Duplicate</DropdownMenuItem>
                <DropdownMenuItem disabled={isFirst} onClick={onMoveUp}>
                  Move up
                </DropdownMenuItem>
                <DropdownMenuItem disabled={isLast} onClick={onMoveDown}>
                  Move down
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={!canDelete}
                  onClick={() => onRemoveField(deleteTargetId)}
                >
                  Delete field
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <BuilderFieldPreview
          field={field}
          settings={settings}
          showRequiredIndicator={showRequiredIndicator}
          selectedFieldId={selectedFieldId}
          isDraggingFromPalette={isDraggingFromPalette}
          activeColumnTargetIndex={activeColumnTargetIndex}
          onSelectNestedField={onSelectNestedField}
          onAddFieldToColumn={onAddFieldToColumn}
        />
      </div>
    </div>
  );
}
