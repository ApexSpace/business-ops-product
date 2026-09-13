"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import {
  FORMS_BUILDER_CANVAS_SCROLL_CLASS,
  FORMS_BUILDER_CANVAS_SECTION_CLASS,
  FORMS_BUILDER_DROP_ACTIVE_CLASS,
} from "@/lib/design/forms-builder-tokens";
import {
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_FORM_SECTION_HEADER_CLASS,
  SETTINGS_PANEL_TITLE_CLASS,
} from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";
import type { FormDefinition } from "@/features/forms/types";
import {
  getFormContainerClass,
  getFormContainerStyle,
  getSubmitButtonClass,
  getSubmitButtonStyle,
} from "@/features/forms/utils/field-style.util";
import { BuilderEmptyState } from "@/features/forms/components/builder/builder-empty-state";
import { SortableFieldRow } from "@/features/forms/components/builder/sortable-field-row";

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
  className,
}: FormCanvasProps) {
  const { fields, settings } = definition;
  const containerStyle = getFormContainerStyle(settings);
  const containerClass = getFormContainerClass(settings);

  return (
    <section
      className={cn(FORMS_BUILDER_CANVAS_SECTION_CLASS, className)}
    >
      <div
        className={FORMS_BUILDER_CANVAS_SCROLL_CLASS}
        onPointerDown={() => onDeselectField?.()}
      >
        <div
          className={cn("border border-border shadow-elevation-xs", containerClass)}
          style={containerStyle}
        >
          <div className={cn("mb-3", SETTINGS_FORM_SECTION_HEADER_CLASS)}>
            <h2 className={SETTINGS_PANEL_TITLE_CLASS}>
              {settings.title || "Untitled form"}
            </h2>
            {settings.description ? (
              <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>{settings.description}</p>
            ) : null}
          </div>

          {fields.length === 0 ? (
            <CanvasDropZone
              id={CANVAS_EMPTY_ID}
              className="min-h-[200px] rounded-[var(--radius-control)]"
              isOverClassName={FORMS_BUILDER_DROP_ACTIVE_CLASS}
            >
              <BuilderEmptyState />
            </CanvasDropZone>
          ) : (
            <SortableContext
              items={fields.map((field) => field.id)}
              strategy={verticalListSortingStrategy}
            >
              <div>
                {fields.map((field, index) => (
                  <SortableFieldRow
                    key={field.id}
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
                    allFields={fields}
                  />
                ))}
              </div>
            </SortableContext>
          )}

          {fields.length > 0 ? (
            <CanvasDropZone
              id={CANVAS_APPEND_ID}
              className={cn(
                "mt-3 min-h-8 rounded-[var(--radius-control)] border border-dashed border-transparent transition-colors",
                isDraggingFromPalette && "min-h-12",
              )}
              isOverClassName={FORMS_BUILDER_DROP_ACTIVE_CLASS}
            >
              <span className="sr-only">Drop zone to append field</span>
            </CanvasDropZone>
          ) : null}

          <div
            className={cn(
              "mt-4 flex",
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
