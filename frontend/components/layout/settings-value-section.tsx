"use client";

import type { ReactNode } from "react";
import { SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsFormActions } from "@/components/layout/settings-form-actions";
import {
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_FORM_SECTION_STACK_CLASS,
} from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

export interface SettingsValueSectionProps {
  title: string;
  description?: ReactNode;
  valueLabel: ReactNode;
  editLabel?: string;
  onEdit: () => void;
  onDiscard?: () => void;
  onSave?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Read-only value section with header pencil.
 * Prefer SettingsInlineEditSection for same-page edit; keep this for
 * summary-only rows that open a caller-owned edit surface.
 */
export function SettingsValueSection({
  title,
  description,
  valueLabel,
  editLabel = "Edit",
  onEdit,
  onDiscard,
  onSave,
  isDirty = false,
  isSaving = false,
  disabled = false,
  className,
}: SettingsValueSectionProps) {
  const showActions = Boolean(onDiscard && onSave && isDirty);

  return (
    <section className={cn(SETTINGS_FORM_SECTION_STACK_CLASS, className)}>
      <div className="flex items-start justify-between gap-[var(--spacing-4)]">
        <div className="min-w-0 space-y-[var(--spacing-1)]">
          <h3 className="text-base font-medium">{title}</h3>
          {description ? (
            <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>{description}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-primary"
          onClick={onEdit}
          disabled={disabled || isSaving}
          aria-label={editLabel}
        >
          <SquarePen className="size-4" aria-hidden />
        </Button>
      </div>
      <div className="min-w-0 text-sm font-semibold text-foreground">
        {valueLabel}
      </div>
      {showActions ? (
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
