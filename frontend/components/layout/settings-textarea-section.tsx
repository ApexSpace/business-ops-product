"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SettingsInlineEditSection } from "@/components/layout/settings-inline-edit-section";
import { SettingsViewRows } from "@/components/layout/settings-view-rows";
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
  /** When provided, enables controlled View/Edit. Defaults to view. */
  isEditing?: boolean;
  onEdit?: () => void;
  maxLength?: number;
}

/**
 * Message / long-text settings section with View (default) and Edit modes.
 * Pass `isEditing` / `onEdit` / `onDiscard` / `onSave` for section-level control.
 * Legacy callers without `onEdit` stay in edit mode for backward compatibility.
 */
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
  isEditing: isEditingProp,
  onEdit,
  maxLength,
}: SettingsTextareaSectionProps) {
  const [internalEditing, setInternalEditing] = useState(false);
  const usesExternalMode = onEdit != null;
  const isEditing = usesExternalMode
    ? Boolean(isEditingProp)
    : internalEditing;

  useEffect(() => {
    if (!usesExternalMode && onDiscard && onSave) {
      // Prefer view-by-default when Discard/Save are present without external mode.
      setInternalEditing(false);
    }
  }, [usesExternalMode, onDiscard, onSave]);

  const handleEdit = () => {
    if (onEdit) onEdit();
    else setInternalEditing(true);
  };

  const handleDiscard = () => {
    onDiscard?.();
    if (!usesExternalMode) setInternalEditing(false);
  };

  const handleSave = () => {
    onSave?.();
    if (!usesExternalMode) setInternalEditing(false);
  };

  const summaryText = value.trim() || "Not set";

  return (
    <SettingsInlineEditSection
      title={title}
      description={description}
      summary={
        <SettingsViewRows
          rows={[{ label: title, value: summaryText }]}
        />
      }
      isEditing={isEditing}
      onEdit={handleEdit}
      onDiscard={onDiscard || onSave ? handleDiscard : undefined}
      onSave={onDiscard || onSave ? handleSave : undefined}
      isDirty={isDirty}
      isSaving={isSaving}
      disabled={disabled}
      className={className}
    >
      <div className="min-w-0 space-y-[var(--spacing-2)]">
        <Label htmlFor={id} className="sr-only">
          {title}
        </Label>
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled || isSaving}
          maxLength={maxLength}
          className={cn(maxLength ? "pb-8" : undefined)}
        />
        {maxLength != null ? (
          <p className="text-xs text-muted-foreground">
            {value.length} / {maxLength} characters
          </p>
        ) : null}
      </div>
    </SettingsInlineEditSection>
  );
}
