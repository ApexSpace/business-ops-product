"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { MoreActionsButton } from "@/components/ui/more-actions-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { FieldType, FormDefinition } from "@/features/forms/types";
import {
  getSubmitButtonClass,
  getSubmitButtonStyle,
} from "@/features/forms/utils/field-style.util";
import { SortableFieldRow } from "@/features/forms/components/builder/sortable-field-row";
import { InsertFieldPopover } from "@/features/forms/components/builder/insert-field-popover";
import {
  FORMS_BUILDER_CANVAS_CLASS,
  FORMS_BUILDER_CANVAS_COLUMN_CLASS,
  FORMS_BUILDER_CANVAS_SCROLL_CLASS,
  FORMS_BUILDER_CARD_CLASS,
  FORMS_BUILDER_INSERT_ROW_CLASS,
  FORMS_BUILDER_TITLE_CLASS,
  FORMS_BUILDER_TITLE_DESCRIPTION_CLASS,
  FORMS_BUILDER_TITLE_EYEBROW_CLASS,
} from "@/lib/design/forms-builder-tokens";

export const CANVAS_EMPTY_ID = "canvas-empty";
export const CANVAS_APPEND_ID = "canvas-append";

interface FormCanvasProps {
  definition: FormDefinition;
  selectedFieldId: string | null;
  isDraggingFromPalette?: boolean;
  activeColumnTargetIndex?: number | null;
  onSelectField: (fieldId: string) => void;
  onDeselectField?: () => void;
  onDuplicateField: (fieldId: string) => void;
  onRemoveField: (fieldId: string) => void;
  onMoveField: (fieldId: string, direction: "up" | "down") => void;
  onAddField: (type: FieldType, index?: number) => void;
  onAddFieldToColumn: (
    columnsFieldId: string,
    columnIndex: number,
    type: FieldType,
  ) => void;
  className?: string;
}

function CanvasDropZone({
  id,
  children,
  className,
  isOverClassName,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  isOverClassName?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { source: "dropzone" } });

  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && isOverClassName)}
    >
      {children}
    </div>
  );
}

export function FormCanvas({
  definition,
  selectedFieldId,
  isDraggingFromPalette,
  activeColumnTargetIndex = null,
  onSelectField,
  onDeselectField,
  onDuplicateField,
  onRemoveField,
  onMoveField,
  onAddField,
  onAddFieldToColumn,
  className,
}: FormCanvasProps) {
  const { fields, settings } = definition;

  return (
    <section className={cn(FORMS_BUILDER_CANVAS_CLASS, className)}>
      <div
        className={FORMS_BUILDER_CANVAS_SCROLL_CLASS}
        onPointerDown={() => onDeselectField?.()}
      >
        <div className={FORMS_BUILDER_CANVAS_COLUMN_CLASS}>
          <div
            className={cn(
              FORMS_BUILDER_CARD_CLASS,
              "flex flex-col gap-[var(--spacing-2)]",
            )}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onDeselectField?.()}
          >
            <div className="flex items-start justify-between gap-[var(--spacing-2)]">
              <div className="min-w-0 space-y-[var(--spacing-2)]">
                <p className={FORMS_BUILDER_TITLE_EYEBROW_CLASS}>
                  Form title & welcome
                </p>
                <h2 className={FORMS_BUILDER_TITLE_CLASS}>
                  {settings.title || "Untitled form"}
                </h2>
                {settings.description ? (
                  <p className={FORMS_BUILDER_TITLE_DESCRIPTION_CLASS}>
                    {settings.description}
                  </p>
                ) : null}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<MoreActionsButton aria-label="Title card actions" />}
                />
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => onDeselectField?.()}>
                    Edit in settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div
            className={FORMS_BUILDER_INSERT_ROW_CLASS}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <InsertFieldPopover
              onAddField={(type) => onAddField(type, 0)}
              ariaLabel="Add field at start"
            />
          </div>

          {fields.length === 0 ? (
            <CanvasDropZone
              id={CANVAS_EMPTY_ID}
              className="min-h-[var(--spacing-6)]"
              isOverClassName="rounded-[var(--radius-card)] bg-violet-primary-light/40"
            >
              <p className="text-center text-sm text-muted-foreground">
                Use + to add your first field.
              </p>
            </CanvasDropZone>
          ) : (
            <SortableContext
              items={fields.map((field) => field.id)}
              strategy={verticalListSortingStrategy}
            >
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-col">
                  <SortableFieldRow
                    field={field}
                    settings={settings}
                    selected={selectedFieldId === field.id}
                    selectedFieldId={selectedFieldId}
                    isFirst={index === 0}
                    isLast={index === fields.length - 1}
                    showRequiredIndicator={settings.showRequiredIndicator}
                    isDraggingFromPalette={isDraggingFromPalette}
                    activeColumnTargetIndex={activeColumnTargetIndex}
                    onSelect={() => onSelectField(field.id)}
                    onSelectNestedField={onSelectField}
                    onDuplicate={() => onDuplicateField(field.id)}
                    onRemoveField={onRemoveField}
                    onMoveUp={() => onMoveField(field.id, "up")}
                    onMoveDown={() => onMoveField(field.id, "down")}
                    onOpenSettings={() => onSelectField(field.id)}
                    onAddFieldToColumn={onAddFieldToColumn}
                    allFields={fields}
                  />
                  <div
                    className={FORMS_BUILDER_INSERT_ROW_CLASS}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <InsertFieldPopover
                      onAddField={(type) => onAddField(type, index + 1)}
                      ariaLabel={`Add field after ${field.label || "field"}`}
                    />
                  </div>
                </div>
              ))}
            </SortableContext>
          )}

          {fields.length > 0 ? (
            <CanvasDropZone
              id={CANVAS_APPEND_ID}
              className="sr-only"
              isOverClassName=""
            >
              <span className="sr-only">Drop zone to append field</span>
            </CanvasDropZone>
          ) : null}

          <div
            className={cn(
              "flex pt-[var(--spacing-2)]",
              settings.submitButtonAlign === "center" && "justify-center",
              settings.submitButtonAlign === "right" && "justify-end",
            )}
          >
            <Button
              type="button"
              variant="brand"
              className={getSubmitButtonClass(settings)}
              style={getSubmitButtonStyle(settings)}
            >
              {settings.submitButtonLabel}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
