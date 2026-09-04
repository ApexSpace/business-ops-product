"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsFormActions } from "@/components/layout/settings-form-actions";
import {
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_FORM_SECTION_STACK_CLASS,
} from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

export interface SettingsToggleSectionProps {
  id: string;
  title: string;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  onDiscard?: () => void;
  onSave?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  /**
   * When false, never render Discard/Save (use for dependent toggles that
   * share dirty state with a parent section that owns the actions).
   * Default true.
   */
  showActions?: boolean;
  className?: string;
  children?: ReactNode;
}

export function SettingsToggleSection({
  id,
  title,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  onDiscard,
  onSave,
  isDirty = false,
  isSaving = false,
  showActions = true,
  className,
  children,
}: SettingsToggleSectionProps) {
  const renderActions =
    showActions && Boolean(onDiscard && onSave && isDirty);

  return (
    <section className={cn(SETTINGS_FORM_SECTION_STACK_CLASS, className)}>
      <div className="flex items-start justify-between gap-[var(--spacing-4)]">
        <div className="min-w-0 space-y-[var(--spacing-1)]">
          <Label htmlFor={id} className="text-base font-medium">
            {title}
          </Label>
          {description ? (
            <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>{description}</p>
          ) : null}
        </div>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled || isSaving}
        />
      </div>
      {children}
      {renderActions ? (
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
