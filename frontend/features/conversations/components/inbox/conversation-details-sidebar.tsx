"use client";

import { CreditCard, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { WORKSPACE_PANEL_CLASS } from "@/features/contacts/workspace/contact-workspace";
import { ContactSidebarAppointments } from "@/features/contacts/components/contact-workspace/contact-sidebar-appointments";
import type { Contact } from "@/features/contacts/types";
import { formatClientSince } from "@/features/conversations/components/inbox/conversation-inbox-utils";
import { cn } from "@/lib/utils";

interface ConversationDetailsSidebarProps {
  contact: Contact;
  onViewFullProfile: () => void;
  className?: string;
}

export function ConversationDetailsSidebar({
  contact,
  onViewFullProfile,
  className,
}: ConversationDetailsSidebarProps) {
  const sinceLabel = formatClientSince(contact.createdAt);
  const phone = contact.phone?.trim();
  const email = contact.email?.trim();

  return (
    <aside className={cn(WORKSPACE_PANEL_CLASS, className)}>
      <header className="shrink-0 border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold text-foreground">Details</h2>
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
        <div className="flex items-start gap-3">
          <ProfileAvatar
            name={contact.label}
            avatarUrl={contact.avatarAssetId ? contact.avatarUrl : null}
            className="size-12 shrink-0"
            fallbackClassName="bg-primary/10 text-sm font-medium text-primary"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold leading-snug">
              {contact.label}
            </p>
            {sinceLabel ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{sinceLabel}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 text-sm">
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-2 text-foreground hover:underline"
            >
              <Phone className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 truncate">{phone}</span>
            </a>
          ) : null}
          {email ? (
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-2 text-foreground hover:underline"
            >
              <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 truncate">{email}</span>
            </a>
          ) : null}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto gap-2 px-0 text-primary"
            onClick={onViewFullProfile}
          >
            <CreditCard className="size-4" aria-hidden />
            Add credit card
          </Button>
        </div>

        <ContactSidebarAppointments contactId={contact.id} variant="ticket" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onViewFullProfile}
        >
          View full profile
        </Button>
      </div>
    </aside>
  );
}
