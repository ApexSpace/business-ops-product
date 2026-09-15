"use client";

import { useEffect, useState } from "react";
import { EntityDetailDrawer } from "@/components/layout/entity-detail-drawer";
import {
  ContactDetailPanel,
  type ContactDetailTabId,
} from "@/features/contacts/components/contact-detail-panel";
import {
  CONTACTS_DRAWER_MOBILE_SHELL_CLASS,
  CONTACTS_DRAWER_SHELL_CLASS,
} from "@/features/contacts/styles/contacts-drawer-tokens";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import "@/features/contacts/styles/contacts-split-layout.css";

interface ContactFullProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  onContactDeleted?: () => void;
  initialSection?: ContactDetailTabId;
}

/**
 * Full Client Details split drawer from Conversations (and other overlays).
 * Uses EntityDetailDrawer + embedded ContactDetailPanel — same shell as Contacts page.
 */
export function ContactFullProfileDrawer({
  open,
  onOpenChange,
  contactId,
  onContactDeleted,
  initialSection = "timeline",
}: ContactFullProfileDrawerProps) {
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] =
    useState<ContactDetailTabId>(initialSection);

  useEffect(() => {
    if (open) {
      setActiveSection(initialSection);
    }
  }, [open, contactId, initialSection]);

  return (
    <EntityDetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      width="split"
      stackLevel="overlay"
      chrome={isMobile ? "mobile-brand" : "default"}
      fullBleed
      className={
        isMobile ? CONTACTS_DRAWER_MOBILE_SHELL_CLASS : CONTACTS_DRAWER_SHELL_CLASS
      }
      title={isMobile ? "Contact profile" : ""}
      bodyClassName="flex flex-col !overflow-hidden"
    >
      {contactId ? (
        <ContactDetailPanel
          embedded
          contactId={contactId}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          variant="drawer"
          drawerTitle={isMobile ? undefined : "Contact profile"}
          onRequestClose={
            isMobile
              ? undefined
              : () => {
                  onOpenChange(false);
                }
          }
          onContactDeleted={() => {
            onOpenChange(false);
            onContactDeleted?.();
          }}
        />
      ) : null}
    </EntityDetailDrawer>
  );
}
