"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormField, FormSettings } from "@/features/forms/types";
import { FieldRenderer } from "@/features/forms/components/builder/field-renderer";
import {
  FORMS_BUILDER_FIELD_HELP_CLASS,
  FORMS_BUILDER_FIELD_PREVIEW_CLASS,
} from "@/lib/design/forms-builder-tokens";
import { FORM_LAYOUT_FIELD_KEYS } from "@/features/forms/constants/form-field-type-keys.constant";

const PREVIEW_RENDERER_TYPES = new Set<FormField["type"]>([
  ...FORM_LAYOUT_FIELD_KEYS,
  "file",
  "signature",
  "rating",
  "range",
  "hidden",
  "captcha",
  "collect_payment",
  "name",
  "address",
]);

interface BuilderFieldPreviewProps {
  field: FormField;
  settings: FormSettings;
  showRequiredIndicator: boolean;
  selectedFieldId: string | null;
  isDraggingFromPalette?: boolean;
  activeColumnTargetIndex?: number | null;
  onSelectNestedField?: (fieldId: string) => void;
  onAddFieldToColumn?: (
    columnsFieldId: string,
    columnIndex: number,
    type: FormField["type"],
  ) => void;
}

export function BuilderFieldPreview({
  field,
  settings,
  showRequiredIndicator: _showRequiredIndicator,
  selectedFieldId,
  isDraggingFromPalette,
  activeColumnTargetIndex,
  onSelectNestedField,
  onAddFieldToColumn,
}: BuilderFieldPreviewProps) {
  if (PREVIEW_RENDERER_TYPES.has(field.type)) {
    return (
      <FieldRenderer
        field={field}
        settings={settings}
        showRequiredIndicator={false}
        mode="builder"
        embedInBuilderRow
        selectedFieldId={selectedFieldId}
        onSelectField={onSelectNestedField}
        isDraggingFromPalette={isDraggingFromPalette}
        activeColumnTargetIndex={activeColumnTargetIndex}
        onAddFieldToColumn={onAddFieldToColumn}
      />
    );
  }

  if (field.type === "radio" || field.type === "checkbox") {
    return (
      <div className="flex flex-col gap-[var(--spacing-2)]">
        {(field.options ?? []).map((option) => (
          <label
            key={option.id}
            className="flex items-center gap-[var(--spacing-2)] text-sm text-foreground"
          >
            <span
              className={cn(
                "size-4 shrink-0 border border-border",
                field.type === "radio" ? "rounded-full" : "rounded-[var(--radius-xs)]",
              )}
              aria-hidden
            />
            {option.label}
          </label>
        ))}
        {field.helpText ? (
          <p className={FORMS_BUILDER_FIELD_HELP_CLASS}>{field.helpText}</p>
        ) : null}
      </div>
    );
  }

  if (field.type === "select" || field.type === "multiselect") {
    return (
      <div className="flex flex-col gap-[var(--spacing-2)]">
        <div className={cn(FORMS_BUILDER_FIELD_PREVIEW_CLASS, "justify-between")}>
          <span className="truncate">
            {field.placeholder || "Select an option"}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </div>
        {field.helpText ? (
          <p className={FORMS_BUILDER_FIELD_HELP_CLASS}>{field.helpText}</p>
        ) : null}
        {field.options?.length ? (
          <p className={FORMS_BUILDER_FIELD_HELP_CLASS}>
            Contains {field.options.length} predefined options
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      <div className={FORMS_BUILDER_FIELD_PREVIEW_CLASS}>
        <span className="truncate">
          {field.placeholder || field.defaultValue || "Enter a value"}
        </span>
      </div>
      {field.helpText ? (
        <p className={FORMS_BUILDER_FIELD_HELP_CLASS}>{field.helpText}</p>
      ) : null}
    </div>
  );
}
