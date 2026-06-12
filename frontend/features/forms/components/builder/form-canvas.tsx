"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
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
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-background",
        className,
      )}
    >
      <div
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4"
        onPointerDown={() => onDeselectField?.()}
      >
        <div
          className={cn("border shadow-sm", containerClass)}
          style={containerStyle}
        >
          <div className="mb-3 space-y-2">
            <h2 className="text-lg font-semibold">
              {settings.title || "Untitled form"}
            </h2>
            {settings.description ? (
              <p className="text-sm text-muted-foreground">{settings.description}</p>
            ) : null}
          </div>

          {fields.length === 0 ? (
            <CanvasDropZone
              id={CANVAS_EMPTY_ID}
              className="min-h-[200px] rounded-lg"
              isOverClassName="ring-2 ring-primary/30 bg-primary/5"
            >
              <BuilderEmptyState />
            </CanvasDropZone>
          ) : (
            <SortableContext
              items={fields.map((field) => field.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {fields.map((field, index) => (
                  <SortableFieldRow
                    key={field.id}
                    field={field}
                    settings={settings}
                    selected={selectedFieldId === field.id}
                    isFirst={index === 0}
                    isLast={index === fields.length - 1}
                    showRequiredIndicator={settings.showRequiredIndicator}
                    onSelect={() => onSelectField(field.id)}
                    onDuplicate={() => onDuplicateField(field.id)}
                    onRemove={() => onRemoveField(field.id)}
                    onMoveUp={() => onMoveField(field.id, "up")}
                    onMoveDown={() => onMoveField(field.id, "down")}
                    onOpenSettings={() => onSelectField(field.id)}
                  />
                ))}
              </div>
            </SortableContext>
          )}

          {fields.length > 0 ? (
            <CanvasDropZone
              id={CANVAS_APPEND_ID}
              className={cn(
                "mt-3 min-h-8 rounded-md border border-dashed border-transparent transition-colors",
                isDraggingFromPalette && "min-h-12",
              )}
              isOverClassName="border-primary/40 bg-primary/5"
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
              variant="default"
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
