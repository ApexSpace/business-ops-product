import { cn } from "@/lib/utils";
import {
  SETTINGS_FORM_ACTIONS_CLASS,
  SETTINGS_FORM_DISCARD_BUTTON_CLASS,
} from "@/lib/design/settings-form-tokens";
import { Button } from "@/components/ui/button";

export interface SettingsFormActionsProps {
  onDiscard: () => void;
  onSave?: () => void;
  isDirty?: boolean;
  isSubmitting?: boolean;
  saveLabel?: string;
  discardLabel?: string;
  disabled?: boolean;
  className?: string;
}

/** Shared Discard + Save changes footer for settings forms. */
export function SettingsFormActions({
  onDiscard,
  onSave,
  isDirty = true,
  isSubmitting = false,
  saveLabel = "Save changes",
  discardLabel = "Discard",
  disabled = false,
  className,
}: SettingsFormActionsProps) {
  return (
    <div className={cn(SETTINGS_FORM_ACTIONS_CLASS, className)}>
      <Button
        type="button"
        variant="outline"
        className={SETTINGS_FORM_DISCARD_BUTTON_CLASS}
        onClick={onDiscard}
        disabled={disabled || isSubmitting || !isDirty}
      >
        {discardLabel}
      </Button>
      <Button
        type="button"
        variant="brand"
        onClick={onSave}
        disabled={disabled || isSubmitting || !isDirty}
      >
        {isSubmitting ? "Saving…" : saveLabel}
      </Button>
    </div>
  );
}
