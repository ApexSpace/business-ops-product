"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsFormActions } from "@/components/layout/settings-form-actions";
import { useSettingsFormHeader } from "@/components/layout/settings-page-layout";
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

function titlesMatch(
  sectionTitle: string,
  pageTitle: string | null | undefined,
): boolean {
  if (!pageTitle) return false;
  return sectionTitle.trim().toLowerCase() === pageTitle.trim().toLowerCase();
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
  const formHeader = useSettingsFormHeader();
  const promoteToPageHeader = titlesMatch(title, formHeader?.pageTitle);
  const showActions = Boolean(onDiscard && onSave);
  const onEditRef = useRef(onEdit);
  onEditRef.current = onEdit;

  useLayoutEffect(() => {
    if (!promoteToPageHeader || !formHeader) return;

    formHeader.setHeaderAction(
      !isEditing ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-primary"
          onClick={() => onEditRef.current()}
          disabled={disabled || isSaving}
          aria-label={editLabel}
        >
          <SquarePen className="size-4" aria-hidden />
        </Button>
      ) : null,
    );

    return () => {
      formHeader.setHeaderAction(null);
    };
  }, [
    promoteToPageHeader,
    formHeader,
    isEditing,
    disabled,
    isSaving,
    editLabel,
  ]);

  const localEditButton = !isEditing ? (
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
  ) : null;

  return (
    <section className={cn(SETTINGS_FORM_SECTION_STACK_CLASS, className)}>
      {!promoteToPageHeader ? (
        <div className="flex items-start justify-between gap-[var(--spacing-4)]">
          <div className="min-w-0 space-y-[var(--spacing-1)]">
            <h3 className="text-base font-medium">{title}</h3>
            {description ? (
              <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>{description}</p>
            ) : null}
          </div>
          {localEditButton}
        </div>
      ) : null}

      {!isEditing ? (
        <div className="min-w-0 text-sm text-foreground">{summary}</div>
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
