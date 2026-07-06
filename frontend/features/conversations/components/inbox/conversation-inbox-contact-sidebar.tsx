"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ContactCompactContextPanel } from "@/features/contacts/components/contact-workspace/contact-compact-context-panel";
import { ContactFullProfileDrawer } from "@/features/contacts/components/contact-full-profile-drawer";
import { WORKSPACE_PANEL_CLASS } from "@/features/contacts/workspace/contact-workspace";
import {
  channelLabel,
  type Conversation,
  type UnifiedConversationThread,
} from "@/features/conversations/api/conversations.api";
import { contactDisplayName } from "@/features/conversations/components/inbox/conversation-inbox-utils";
import type { ConversationInboxContactSidebarState } from "@/features/conversations/hooks/use-conversation-inbox-contact-sidebar";
import { unifiedThreadDisplayName } from "@/features/conversations/utils/unified-thread.utils";
import { cn } from "@/lib/utils";

interface ConversationInboxContactSidebarProps {
  selected: Conversation | undefined;
  selectedThread?: UnifiedConversationThread;
  sidebarState: ConversationInboxContactSidebarState;
  className?: string;
}

function ConversationInboxContactFallback({
  selected,
  selectedThread,
}: Pick<
  ConversationInboxContactSidebarProps,
  "selected" | "selectedThread"
>) {
  const displayName = selectedThread
    ? unifiedThreadDisplayName(selectedThread)
    : selected
      ? contactDisplayName(selected)
      : "";

  return (
    <aside className={cn(WORKSPACE_PANEL_CLASS, "h-full w-full")}>
      <div className="space-y-4 p-4 text-sm">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Contact
          </p>
          <p className="mt-1 font-medium">{displayName}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Channels
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(selectedThread?.channels ?? [selected!.channel]).map((channel) => (
              <Badge key={channel} variant="secondary">
                {channelLabel(channel)}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Status
          </p>
          <p className="mt-1 capitalize">{selected!.status.toLowerCase()}</p>
        </div>
      </div>
    </aside>
  );
}

export function ConversationInboxContactSidebar({
  selected,
  selectedThread,
  sidebarState: sidebar,
  className,
}: ConversationInboxContactSidebarProps) {
  const contactId = selectedThread?.contactId ?? selected?.contactId ?? null;

  if (!selected) {
    return (
      <aside
        className={cn(
          WORKSPACE_PANEL_CLASS,
          "h-full w-full items-center justify-center p-4 text-sm text-muted-foreground",
          className,
        )}
      >
        No conversation selected.
      </aside>
    );
  }

  if (!contactId) {
    return (
      <ConversationInboxContactFallback
        selected={selected}
        selectedThread={selectedThread}
      />
    );
  }

  if (sidebar.contactLoading) {
    return <Skeleton className={cn("h-full rounded-2xl", className)} />;
  }

  if (sidebar.contactError || !sidebar.contact) {
    return (
      <aside
        className={cn(
          WORKSPACE_PANEL_CLASS,
          "h-full items-center justify-center p-4 text-center text-sm",
          className,
        )}
      >
        <p className="text-muted-foreground">Contact not found.</p>
        <Link
          href={`/business/contacts/${contactId}`}
          className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
        >
          Open contact
        </Link>
      </aside>
    );
  }

  return (
    <>
      <ContactCompactContextPanel
        contact={sidebar.contact}
        onViewFullProfile={sidebar.onViewFullProfile}
        className={cn("h-full w-full", className)}
      />

      <ContactFullProfileDrawer
        open={sidebar.fullProfileOpen}
        onOpenChange={sidebar.setFullProfileOpen}
        contactId={contactId}
      />
    </>
  );
}
