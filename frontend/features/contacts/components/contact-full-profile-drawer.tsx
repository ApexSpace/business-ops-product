"use client";

import { useEffect, useState } from "react";
import { FormSheet } from "@/components/forms/form-sheet";
import {
  ContactDetailPanel,
  type ContactDetailTabId,
} from "@/features/contacts/components/contact-detail-panel";
import {
  FORM_DRAWER_BODY_FLEX_CLASS,
} from "@/components/forms/form-drawer-shell";
import { useContactDetail } from "@/features/contacts/hooks/use-contact-detail";
import "@/features/contacts/styles/contacts-split-layout.css";

interface ContactFullProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  onContactDeleted?: () => void;
  initialSection?: ContactDetailTabId;
}

export function ContactFullProfileDrawer({
  open,
  onOpenChange,
  contactId,
  onContactDeleted,
  initialSection = "timeline",
}: ContactFullProfileDrawerProps) {
  const [activeSection, setActiveSection] =
    useState<ContactDetailTabId>(initialSection);
  const { data: contact } = useContactDetail(contactId ?? "");

  useEffect(() => {
    if (open) {
      setActiveSection(initialSection);
    }
  }, [open, contactId, initialSection]);

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
      bodyClassName={FORM_DRAWER_BODY_FLEX_CLASS}
      contentClassName="min-h-0 flex-1"
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
