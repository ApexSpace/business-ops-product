"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SettingsFormActions } from "@/components/layout/settings-form-actions";
import {
  SETTINGS_FORM_DESCRIPTION_CLASS,
  SETTINGS_FORM_SECTION_STACK_CLASS,
} from "@/lib/design/settings-form-tokens";
import { cn } from "@/lib/utils";

export interface SettingsTextareaSectionProps {
  id: string;
  title: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  onDiscard?: () => void;
  onSave?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  className?: string;
}

export function SettingsTextareaSection({
  id,
  title,
  description,
  value,
  onChange,
  placeholder,
  rows = 4,
  disabled = false,
  onDiscard,
  onSave,
  isDirty = false,
  isSaving = false,
  className,
}: SettingsTextareaSectionProps) {
  const showActions = Boolean(onDiscard && onSave);

  return (
    <section className={cn(SETTINGS_FORM_SECTION_STACK_CLASS, className)}>
      <div className="min-w-0 space-y-[var(--spacing-2)]">
        <Label htmlFor={id} className="text-base font-medium">
          {title}
        </Label>
        {description ? (
          <p className={SETTINGS_FORM_DESCRIPTION_CLASS}>{description}</p>
        ) : null}
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled || isSaving}
        />
      </div>
      {showActions ? (
        <SettingsFormActions
          onDiscard={onDiscard!}
          isDirty={isDirty}
          isSubmitting={isSaving}
          disabled={disabled}
        />
      ) : null}
    </section>
  );
}
