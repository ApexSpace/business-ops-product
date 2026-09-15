"use client";

import type { Contact } from "@/features/contacts/types";
import {
  ContactAddNoteAction,
  ContactDetailField,
} from "@/features/contacts/components/contact-detail-field";
import { ContactInlineNoteComposer } from "@/features/contacts/components/contact-inline-note-composer";
import { ContactInlineEditableField } from "@/features/contacts/components/contact-workspace/contact-sidebar-details-fields";
import {
  CONTACTS_AVATAR_FALLBACK_CLASS,
  CONTACTS_AVATAR_VIEW_CLASS,
  CONTACTS_DETAIL_FIELD_LABEL_CLASS,
  CONTACTS_DETAIL_FIELD_VALUE_CLASS,
  CONTACTS_DRAWER_PROFILE_BODY_CLASS,
  CONTACTS_DRAWER_PROFILE_COL_CLASS,
  CONTACTS_DRAWER_PROFILE_FIELDS_CLASS,
  CONTACTS_DRAWER_PROFILE_FIELD_ROW_CLASS,
  CONTACTS_DRAWER_PROFILE_IDENTITY_CLASS,
  CONTACTS_DRAWER_PROFILE_NOTE_CLASS,
  CONTACTS_DRAWER_PROFILE_SCROLL_CLASS,
} from "@/features/contacts/styles/contacts-drawer-tokens";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { cn } from "@/lib/utils";

interface ContactDrawerProfilePanelProps {
  contact: Contact;
  contactId: string;
  noteComposerOpen?: boolean;
  onNoteComposerOpenChange?: (open: boolean) => void;
  showContactDetails?: boolean;
  className?: string;
}

/**
 * Figma Client Details left column — centered 92px avatar, label/value fields,
 * compact "Add Note". Shared tokens keep create + view drawers aligned.
 */
export function ContactDrawerProfilePanel({
  contact,
  contactId,
  noteComposerOpen = false,
  onNoteComposerOpenChange,
  showContactDetails = true,
  className,
}: ContactDrawerProfilePanelProps) {
  const company = contact.companyName?.trim() ?? "";

  return (
    <aside className={cn(CONTACTS_DRAWER_PROFILE_COL_CLASS, className)}>
      <div className={CONTACTS_DRAWER_PROFILE_SCROLL_CLASS}>
        <div className={CONTACTS_DRAWER_PROFILE_BODY_CLASS}>
          <div className={CONTACTS_DRAWER_PROFILE_IDENTITY_CLASS}>
            <ProfileAvatar
              name={contact.label}
              avatarUrl={contact.avatarAssetId ? contact.avatarUrl : null}
              size="lg"
              className={CONTACTS_AVATAR_VIEW_CLASS}
              fallbackClassName={CONTACTS_AVATAR_FALLBACK_CLASS}
            />
          </div>

          <div className={CONTACTS_DRAWER_PROFILE_FIELDS_CLASS}>
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
                  className={CONTACTS_DRAWER_PROFILE_FIELD_ROW_CLASS}
                />
                <ContactInlineEditableField
                  contact={contact}
                  kind="phone"
                  label="Phone Number"
                  labelClassName={CONTACTS_DETAIL_FIELD_LABEL_CLASS}
                  valueClassName={CONTACTS_DETAIL_FIELD_VALUE_CLASS}
                  className={CONTACTS_DRAWER_PROFILE_FIELD_ROW_CLASS}
                />
              </>
            ) : null}

            {company ? (
              <ContactDetailField label="Company" value={company} />
            ) : null}
          </div>

          <div className={CONTACTS_DRAWER_PROFILE_NOTE_CLASS}>
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
        </div>
      </div>
    </aside>
  );
}
