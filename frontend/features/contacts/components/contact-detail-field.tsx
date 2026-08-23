"use client";

import { DrawerAddAction } from "@/components/drawer/drawer-add-action";
import {
  CONTACTS_DETAIL_FIELD_LABEL_CLASS,
  CONTACTS_DETAIL_FIELD_ROW_CLASS,
  CONTACTS_DETAIL_FIELD_VALUE_CLASS,
} from "@/features/contacts/styles/contacts-drawer-tokens";
import { cn } from "@/lib/utils";

interface ContactDetailFieldProps {
  label: string;
  value?: string | null;
  className?: string;
  valueClassName?: string;
}

/** Figma Client Details label-above-value row — compact 4px rhythm. */
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

/** Figma "+ Add Note" — shared DrawerAddAction. */
export function ContactAddNoteAction({
  onClick,
  disabled,
  className,
  label = "Add Note",
}: ContactAddNoteActionProps) {
  return (
    <DrawerAddAction
      label={label}
      onClick={onClick}
      disabled={disabled}
      className={className}
    />
  );
}
