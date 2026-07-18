"use client";

import { PanelRightOpen } from "lucide-react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { ContactSidebarAppointments } from "@/features/contacts/components/contact-workspace/contact-sidebar-appointments";
import { ContactSidebarDetailsFields } from "@/features/contacts/components/contact-workspace/contact-sidebar-details-fields";
import { WORKSPACE_PANEL_CLASS } from "@/features/contacts/workspace/contact-workspace";
import type { Contact } from "@/features/contacts/types";
import { cn } from "@/lib/utils";

interface ContactCompactContextPanelProps {
  contact: Contact;
  onViewFullProfile: () => void;
  className?: string;
}

export function ContactCompactContextPanel({
  contact,
  onViewFullProfile,
  className,
}: ContactCompactContextPanelProps) {
  return (
    <aside className={cn(WORKSPACE_PANEL_CLASS, className)}>
      <div className="shrink-0 border-b border-border/60 px-4 py-4">
        <div className="flex items-start gap-3">
          <ProfileAvatar
            name={contact.label}
            avatarUrl={contact.avatarAssetId ? contact.avatarUrl : null}
            className="size-12 shrink-0"
            fallbackClassName="bg-primary/10 text-sm font-medium text-primary"
          />
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-base font-semibold leading-snug">
              {contact.label}
            </h2>
            <button
              type="button"
              onClick={onViewFullProfile}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <PanelRightOpen className="size-3.5 shrink-0" aria-hidden />
              View full profile
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-5">
          <ContactSidebarDetailsFields
            contact={contact}
            onRequestEdit={onViewFullProfile}
            showNotes={false}
          />
          <div className="border-t border-border/50 pt-5">
            <ContactSidebarAppointments contactId={contact.id} />
          </div>
        </div>
      </div>
    </aside>
  );
}
