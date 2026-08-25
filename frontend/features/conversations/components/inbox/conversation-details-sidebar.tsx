"use client";

import { CreditCard, Mail, Phone } from "lucide-react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import {
  INBOX_DETAILS_HEADER_CLASS,
  INBOX_DETAILS_PANEL_CLASS,
  INBOX_DETAILS_SECTION_CLASS,
} from "@/features/contacts/workspace/contact-workspace";
import { ContactSidebarAppointments } from "@/features/contacts/components/contact-workspace/contact-sidebar-appointments";
import type { Contact } from "@/features/contacts/types";
import { formatClientSince } from "@/features/conversations/components/inbox/conversation-inbox-utils";
import {
  DRAWER_CLIENT_ACTION_ICON_CLASS,
  DRAWER_CLIENT_AVATAR_CLASS,
  DRAWER_CLIENT_AVATAR_FALLBACK_CLASS,
  DRAWER_CLIENT_CONTACT_ICON_CLASS,
  DRAWER_CLIENT_CONTACT_LIST_CLASS,
  DRAWER_CLIENT_CONTACT_ROW_CLASS,
  DRAWER_CLIENT_CREDIT_CARD_CLASS,
  DRAWER_CLIENT_NAME_CLASS,
  DRAWER_CLIENT_SINCE_CLASS,
} from "@/lib/design/drawer-tokens";
import { cn } from "@/lib/utils";

interface ConversationDetailsSidebarProps {
  contact: Contact;
  onViewFullProfile: () => void;
  onAddCreditCard?: () => void;
  className?: string;
}

export function ConversationDetailsSidebar({
  contact,
  onViewFullProfile,
  onAddCreditCard,
  className,
}: ConversationDetailsSidebarProps) {
  const sinceLabel = formatClientSince(contact.createdAt);
  const phone = contact.phone?.trim() || contact.phoneNumber?.trim();
  const email = contact.email?.trim();

  return (
    <aside className={cn(INBOX_DETAILS_PANEL_CLASS, className)}>
      <header className={INBOX_DETAILS_HEADER_CLASS}>
        <h2 className="text-base font-semibold text-foreground">Details</h2>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className={INBOX_DETAILS_SECTION_CLASS}>
          <div className="flex items-center gap-4">
            <ProfileAvatar
              name={contact.label}
              avatarUrl={contact.avatarAssetId ? contact.avatarUrl : null}
              className={DRAWER_CLIENT_AVATAR_CLASS}
              fallbackClassName={DRAWER_CLIENT_AVATAR_FALLBACK_CLASS}
            />
            <div className="min-w-0 flex-1">
              <button
                type="button"
                className={cn(
                  DRAWER_CLIENT_NAME_CLASS,
                  "w-full text-left hover:underline",
                )}
                onClick={onViewFullProfile}
              >
                {contact.label}
              </button>
              {sinceLabel ? (
                <p className={cn(DRAWER_CLIENT_SINCE_CLASS, "mt-0.5")}>
                  {sinceLabel}
                </p>
              ) : null}
            </div>
          </div>

          <div className={DRAWER_CLIENT_CONTACT_LIST_CLASS}>
            {phone ? (
              <a href={`tel:${phone}`} className={DRAWER_CLIENT_CONTACT_ROW_CLASS}>
                <Phone
                  className={cn(
                    DRAWER_CLIENT_CONTACT_ICON_CLASS,
                    "text-[var(--drawer-text-secondary)]",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 truncate">{phone}</span>
              </a>
            ) : null}
            {email ? (
              <a
                href={`mailto:${email}`}
                className={DRAWER_CLIENT_CONTACT_ROW_CLASS}
              >
                <Mail
                  className={cn(
                    DRAWER_CLIENT_CONTACT_ICON_CLASS,
                    "text-[var(--drawer-text-secondary)]",
                  )}
                  aria-hidden
                />
                <span className="min-w-0 truncate">{email}</span>
              </a>
            ) : null}
            <button
              type="button"
              className={DRAWER_CLIENT_CREDIT_CARD_CLASS}
              onClick={onAddCreditCard ?? onViewFullProfile}
            >
              <CreditCard
                className={DRAWER_CLIENT_ACTION_ICON_CLASS}
                aria-hidden
              />
              Add credit card
            </button>
          </div>
        </section>

        <section className={INBOX_DETAILS_SECTION_CLASS}>
          <p className="text-xs text-muted-foreground">Next appointment</p>
          <ContactSidebarAppointments contactId={contact.id} variant="ticket" />
        </section>
      </div>
    </aside>
  );
}
