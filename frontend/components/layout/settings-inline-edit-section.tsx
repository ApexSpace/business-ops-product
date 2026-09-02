"use client";

import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsFormActions } from "@/components/layout/settings-form-actions";
import {
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_FORM_SECTION_STACK_CLASS,
} from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

export interface SettingsInlineEditSectionProps {
  title: string;
  description?: ReactNode;
  summary: ReactNode;
  isEditing: boolean;
  onEdit: () => void;
  onDiscard?: () => void;
  onSave?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  disabled?: boolean;
  editLabel?: string;
  children?: ReactNode;
  className?: string;
}

export function SettingsInlineEditSection({
  title,
  description,
  summary,
  isEditing,
  onEdit,
  onDiscard,
  onSave,
  isDirty = false,
  isSaving = false,
  disabled = false,
  editLabel = "Edit",
  children,
  className,
}: SettingsInlineEditSectionProps) {
  const showActions = Boolean(onDiscard && onSave);

  return (
    <section className={cn(SETTINGS_FORM_SECTION_STACK_CLASS, className)}>
      <div className="space-y-[var(--spacing-1)]">
        <h3 className="text-base font-medium">{title}</h3>
        {description ? (
          <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>{description}</p>
        ) : null}
      </div>

      {!isEditing ? (
        <div className="flex items-start justify-between gap-[var(--spacing-4)] rounded-[var(--radius-control)] border border-border bg-background px-[var(--spacing-4)] py-[var(--spacing-3)]">
          <div className="min-w-0 text-sm text-foreground">{summary}</div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5 text-primary"
            onClick={onEdit}
            disabled={disabled || isSaving}
          >
            <Pencil className="size-3.5" aria-hidden />
            {editLabel}
          </Button>
        </div>
      ) : (
        <div className="space-y-[var(--spacing-4)]">{children}</div>
      )}

      {isEditing && showActions ? (
        <SettingsFormActions
          onDiscard={onDiscard!}
          onSave={onSave}
          isDirty={isDirty}
          isSubmitting={isSaving}
          disabled={disabled}
        />
      ) : null}
    </section>
  );
}
