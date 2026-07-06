"use client";

import { useEffect, useState } from "react";
import { FormSheet } from "@/components/forms/form-sheet";
import {
  ContactDetailPanel,
  type ContactDetailTabId,
} from "@/features/contacts/components/contact-detail-panel";
import {
  CONTACT_PROFILE_DRAWER_BODY_CLASS,
  CONTACT_PROFILE_DRAWER_DESCRIPTION_CLASS,
  CONTACT_PROFILE_DRAWER_HEADER_CLASS,
  CONTACT_PROFILE_DRAWER_SHEET_CLASS,
  CONTACT_PROFILE_DRAWER_TITLE_CLASS,
} from "@/features/contacts/components/contact-full-profile-drawer-shell";
import { useContactDetail } from "@/features/contacts/hooks/use-contact-detail";
import "@/features/contacts/styles/contacts-split-layout.css";

interface ContactFullProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  onContactDeleted?: () => void;
}

export function ContactFullProfileDrawer({
  open,
  onOpenChange,
  contactId,
  onContactDeleted,
}: ContactFullProfileDrawerProps) {
  const [activeSection, setActiveSection] =
    useState<ContactDetailTabId>("timeline");
  const { data: contact } = useContactDetail(contactId ?? "");

  useEffect(() => {
    if (open) {
      setActiveSection("timeline");
    }
  }, [open, contactId]);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Contact profile"
      description={
        contact?.label
          ? `Conversation context · ${contact.label}`
          : "View and manage contact details."
      }
      hideFooter
      className={CONTACT_PROFILE_DRAWER_SHEET_CLASS}
      headerClassName={CONTACT_PROFILE_DRAWER_HEADER_CLASS}
      titleClassName={CONTACT_PROFILE_DRAWER_TITLE_CLASS}
      descriptionClassName={CONTACT_PROFILE_DRAWER_DESCRIPTION_CLASS}
      contentClassName="min-h-0 flex-1"
      bodyClassName={CONTACT_PROFILE_DRAWER_BODY_CLASS}
    >
      {contactId ? (
        <ContactDetailPanel
          contactId={contactId}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          variant="drawer"
          onContactDeleted={() => {
            onOpenChange(false);
            onContactDeleted?.();
          }}
        />
      ) : null}
    </FormSheet>
  );
}
