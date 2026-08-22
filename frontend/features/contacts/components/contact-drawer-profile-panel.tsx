"use client";

import { Pencil } from "lucide-react";
import type { Contact } from "@/features/contacts/types";
import {
  ContactAddNoteAction,
  ContactDetailField,
} from "@/features/contacts/components/contact-detail-field";
import { ContactInlineNoteComposer } from "@/features/contacts/components/contact-inline-note-composer";
import { ContactInlineEditableField } from "@/features/contacts/components/contact-workspace/contact-sidebar-details-fields";
import {
  CONTACTS_AVATAR_VIEW_CLASS,
  CONTACTS_DETAIL_FIELD_LABEL_CLASS,
  CONTACTS_DETAIL_FIELD_VALUE_CLASS,
} from "@/features/contacts/styles/contacts-drawer-tokens";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { cn } from "@/lib/utils";

interface ContactDrawerProfilePanelProps {
  contact: Contact;
  contactId: string;
  onEdit: () => void;
  showEditButton?: boolean;
  noteComposerOpen?: boolean;
  onNoteComposerOpenChange?: (open: boolean) => void;
  showContactDetails?: boolean;
  className?: string;
}

/**
 * Figma Client Details left column — centered 92px avatar, label/value fields,
 * compact "+ Add Note". Shared tokens keep create + view drawers aligned.
 */
export function ContactDrawerProfilePanel({
  contact,
  contactId,
  onEdit,
  showEditButton = true,
  noteComposerOpen = false,
  onNoteComposerOpenChange,
  showContactDetails = true,
  className,
}: ContactDrawerProfilePanelProps) {
  const company = contact.companyName?.trim() ?? "";

  return (
    <aside className={cn("contacts-drawer-profile-panel", className)}>
      <div className="contacts-drawer-profile-identity">
        <div className="relative mx-auto w-fit">
          <ProfileAvatar
            name={contact.label}
            avatarUrl={contact.avatarAssetId ? contact.avatarUrl : null}
            size="lg"
            className={cn(CONTACTS_AVATAR_VIEW_CLASS, "!size-[92px]")}
            fallbackClassName="bg-[#3B82F6] text-[28px] font-bold text-white"
          />
          {showEditButton ? (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="absolute -right-1 -top-1 size-7 rounded-full border-[#E8E4DC] bg-white text-violet-primary-normal shadow-sm hover:bg-violet-primary-surface"
              onClick={onEdit}
              aria-label="Edit contact"
            >
              <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="contacts-drawer-profile-fields">
        <ContactDetailField label="First Name" value={contact.firstName} />
        <ContactDetailField label="Last Name" value={contact.lastName} />

        {showContactDetails ? (
          <>
            <ContactInlineEditableField
              contact={contact}
              kind="email"
              label="Email"
              labelClassName={CONTACTS_DETAIL_FIELD_LABEL_CLASS}
              valueClassName={CONTACTS_DETAIL_FIELD_VALUE_CLASS}
              className="contacts-drawer-profile-field-row"
            />
            <ContactInlineEditableField
              contact={contact}
              kind="phone"
              label="Phone Number"
              labelClassName={CONTACTS_DETAIL_FIELD_LABEL_CLASS}
              valueClassName={CONTACTS_DETAIL_FIELD_VALUE_CLASS}
              className="contacts-drawer-profile-field-row"
            />
          </>
        ) : null}

        {company ? <ContactDetailField label="Company" value={company} /> : null}
      </div>

      <div className="contacts-drawer-profile-note">
        {!noteComposerOpen ? (
          <ContactAddNoteAction
            onClick={() => onNoteComposerOpenChange?.(true)}
          />
        ) : (
          <ContactInlineNoteComposer
            contactId={contactId}
            onCancel={() => onNoteComposerOpenChange?.(false)}
            onSuccess={() => onNoteComposerOpenChange?.(false)}
            variant="compact"
            showLabel={false}
          />
        )}
      </div>
    </aside>
  );
}
