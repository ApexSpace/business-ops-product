"use client";

import { ActionButton } from "@/components/ui/action-button";
import { Textarea } from "@/components/ui/textarea";
import {
  canCollapseAppointmentFormNotes,
  isAppointmentFormNotesVisible,
} from "@/features/appointments/components/drawer/appointment-drawer-notes.util";
import { APPOINTMENT_DRAWER_FIELD_CLASS } from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

export const APPOINTMENT_DRAWER_NOTES_MAX_LENGTH = 400;

interface AppointmentDrawerNotesFieldProps {
  value: string;
  onChange: (value: string) => void;
  expanded: boolean;
  onCollapseEmpty: () => void;
}

/**
 * Create/edit appointment notes: expand-in-place field bound to the form.
 * Does not submit notes on its own — the drawer save action includes `notes`.
 */
export function AppointmentDrawerNotesField({
  value,
  onChange,
  expanded,
  onCollapseEmpty,
}: AppointmentDrawerNotesFieldProps) {
  if (!isAppointmentFormNotesVisible(expanded, value)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Add a description to the client"
        rows={3}
        maxLength={APPOINTMENT_DRAWER_NOTES_MAX_LENGTH}
        className={cn(
          APPOINTMENT_DRAWER_FIELD_CLASS,
          "min-h-[88px] resize-none py-3",
        )}
      />
      {canCollapseAppointmentFormNotes(value) ? (
        <div className="flex items-center justify-end">
          <ActionButton
            type="button"
            variant="outline"
            size="sm"
            className="h-9 min-w-[72px] px-4"
            onClick={onCollapseEmpty}
          >
            Cancel
          </ActionButton>
        </div>
      ) : null}
    </div>
  );
}
