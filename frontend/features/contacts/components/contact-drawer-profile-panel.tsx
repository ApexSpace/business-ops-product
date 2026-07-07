"use client";

import { Pencil } from "lucide-react";
import type { Contact } from "@/features/contacts/types";
import { ContactInlineNoteComposer } from "@/features/contacts/components/contact-inline-note-composer";
import {
  CONTACT_FIELD_LABEL_CLASS,
} from "@/features/contacts/components/contact-workspace/contact-sidebar-details-fields";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { cn } from "@/lib/utils";

interface ContactDrawerProfilePanelProps {
  contact: Contact;
  contactId: string;
  onEdit: () => void;
  noteComposerOpen?: boolean;
  onNoteComposerOpenChange?: (open: boolean) => void;
  className?: string;
}

function ProfileField({
  label,
  value,
  hrefPrefix,
}: {
  label: string;
  value?: string | null;
  hrefPrefix?: "tel" | "mailto";
}) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 text-left">
      <span className={cn("block", CONTACT_FIELD_LABEL_CLASS)}>{label}</span>
      {hrefPrefix ? (
        <a
          href={`${hrefPrefix}:${trimmed}`}
          className={cn(
            "block text-sm font-medium leading-snug text-foreground hover:underline",
            hrefPrefix === "mailto" && "break-all",
          )}
        >
          {trimmed}
        </a>
      ) : (
        <p className="text-sm font-medium leading-snug text-foreground">{trimmed}</p>
      )}
    </div>
  );
}

/** Left profile column for the contacts split drawer (Mangomint-style). */
export function ContactDrawerProfilePanel({
  contact,
  contactId,
  onEdit,
  noteComposerOpen = false,
  onNoteComposerOpenChange,
  className,
}: ContactDrawerProfilePanelProps) {
  const phone = contact.phone?.trim();
  const email = contact.email?.trim();
  const company = contact.companyName?.trim();
  const hasContactFields = Boolean(phone || email || company);

  return (
    <aside className={cn("contacts-drawer-profile-panel", className)}>
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <ProfileAvatar
            name={contact.label}
            avatarUrl={contact.avatarAssetId ? contact.avatarUrl : null}
            size="lg"
            className="!size-20 ring-1 ring-border"
            fallbackClassName="bg-primary/10 text-base font-semibold text-primary"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="absolute -right-1 -top-1 size-7 rounded-full bg-background shadow-sm"
            onClick={onEdit}
            aria-label="Edit contact"
          >
            <Pencil className="size-3.5" />
          </Button>
        </div>
        <h2 className="mt-3 text-base font-semibold leading-snug">
          {contact.label}
        </h2>
      </div>

      <div className="mt-5 space-y-5 border-t border-border/70 pt-5 text-left">
        {hasContactFields ? (
          <>
            <ProfileField label="Phone" value={phone} hrefPrefix="tel" />
            <ProfileField label="Email" value={email} hrefPrefix="mailto" />
            <ProfileField label="Company" value={company} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No contact details yet</p>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-1.5 border-t border-border/70 pt-5 text-left">
        <span className={cn("block", CONTACT_FIELD_LABEL_CLASS)}>Notes</span>
        {!noteComposerOpen ? (
          <button
            type="button"
            onClick={() => onNoteComposerOpenChange?.(true)}
            className="block text-sm font-medium text-primary hover:underline"
          >
            Add note
          </button>
        ) : null}
        {noteComposerOpen ? (
          <ContactInlineNoteComposer
            contactId={contactId}
            onCancel={() => onNoteComposerOpenChange?.(false)}
            onSuccess={() => onNoteComposerOpenChange?.(false)}
            showLabel={false}
          />
        ) : null}
      </div>
    </aside>
  );
}
