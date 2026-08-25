import { FormActions } from "@/components/layout/form-actions";
import { Button } from "@/components/ui/button";

export interface SettingsFormActionsProps {
  onDiscard: () => void;
  isDirty?: boolean;
  isSubmitting?: boolean;
  saveLabel?: string;
  discardLabel?: string;
  disabled?: boolean;
}

/** Shared Discard + Save changes footer for settings forms. */
export function SettingsFormActions({
  onDiscard,
  isDirty = true,
  isSubmitting = false,
  saveLabel = "Save changes",
  discardLabel = "Discard",
  disabled = false,
}: SettingsFormActionsProps) {
  return (
    <FormActions>
      <Button
        type="button"
        variant="outline"
        onClick={onDiscard}
        disabled={disabled || isSubmitting || !isDirty}
      >
        {discardLabel}
      </Button>
      <Button type="submit" variant="brand" disabled={disabled || isSubmitting}>
        {isSubmitting ? "Saving…" : saveLabel}
      </Button>
    </FormActions>
  );
}
