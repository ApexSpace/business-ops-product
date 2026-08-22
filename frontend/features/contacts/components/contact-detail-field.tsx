"use client";

import { Plus } from "lucide-react";
import {
  CONTACTS_DETAIL_FIELD_LABEL_CLASS,
  CONTACTS_DETAIL_FIELD_ROW_CLASS,
  CONTACTS_DETAIL_FIELD_VALUE_CLASS,
} from "@/features/contacts/styles/contacts-drawer-tokens";
import {
  APPOINTMENT_DRAWER_ADD_ACTION_CLASS,
  APPOINTMENT_DRAWER_ADD_ACTION_ICON_CLASS,
} from "@/features/appointments/styles/appointment-drawer-tokens";
import { cn } from "@/lib/utils";

interface ContactDetailFieldProps {
  label: string;
  value?: string | null;
  className?: string;
  valueClassName?: string;
}

/** Figma Client Details label-above-value row — compact 8px rhythm. */
export function ContactDetailField({
  label,
  value,
  className,
  valueClassName,
}: ContactDetailFieldProps) {
  const display = value?.trim() || "—";
  return (
    <div className={cn(CONTACTS_DETAIL_FIELD_ROW_CLASS, className)}>
      <span className={CONTACTS_DETAIL_FIELD_LABEL_CLASS}>{label}</span>
      <span className={cn(CONTACTS_DETAIL_FIELD_VALUE_CLASS, valueClassName)}>
        {display}
      </span>
    </div>
  );
}

interface ContactAddNoteActionProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

/** Figma "+ Add Note" — purple square plus + label. */
export function ContactAddNoteAction({
  onClick,
  disabled,
  className,
  label = "Add Note",
}: ContactAddNoteActionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        APPOINTMENT_DRAWER_ADD_ACTION_CLASS,
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <span className={APPOINTMENT_DRAWER_ADD_ACTION_ICON_CLASS} aria-hidden>
        <Plus className="size-3.5" strokeWidth={2.5} />
      </span>
      {label}
    </button>
  );
}
