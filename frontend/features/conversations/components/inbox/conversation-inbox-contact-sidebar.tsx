"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ConversationDetailsSidebar } from "@/features/conversations/components/inbox/conversation-details-sidebar";
import { ContactFullProfileDrawer } from "@/features/contacts/components/contact-full-profile-drawer";
import {
  INBOX_DETAILS_HEADER_CLASS,
  INBOX_DETAILS_PANEL_CLASS,
} from "@/features/contacts/workspace/contact-workspace";
import { useConversationsHost } from "@/features/conversations/conversations-host-context";
import {
  channelLabel,
  type Conversation,
  type UnifiedConversationThread,
} from "@/features/conversations/api/conversations.api";
import { contactDisplayName } from "@/features/conversations/components/inbox/conversation-inbox-utils";
import type { ConversationInboxContactSidebarState } from "@/features/conversations/hooks/use-conversation-inbox-contact-sidebar";
import { unifiedThreadDisplayName } from "@/features/conversations/utils/unified-thread.utils";
import { cn } from "@/lib/utils";

function DetailsPaneHeader() {
  return (
    <header className={INBOX_DETAILS_HEADER_CLASS}>
      <h2 className="truncate text-base font-semibold leading-none text-foreground">
        Details
      </h2>
    </header>
  );
}

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
    <aside className={cn(INBOX_DETAILS_PANEL_CLASS, "h-full w-full")}>
      <DetailsPaneHeader />
      <div className="space-y-4 px-6 py-6 text-sm">
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
  const { mode } = useConversationsHost();
  const contactId = selectedThread?.contactId ?? selected?.contactId ?? null;

  if (!selected) {
    return (
      <aside className={cn(INBOX_DETAILS_PANEL_CLASS, className)}>
        <DetailsPaneHeader />
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
          No conversation selected.
        </div>
      </aside>
    );
  }

  // Platform inbox: keep a reduced sidebar — no /business/contacts deep-links.
  if (mode === "platform") {
    return (
      <ConversationInboxContactFallback
        selected={selected}
        selectedThread={selectedThread}
      />
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
    return (
      <aside className={cn(INBOX_DETAILS_PANEL_CLASS, className)}>
        <DetailsPaneHeader />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-border px-6 py-6">
            <div className="flex items-center gap-4">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <div className="flex flex-col gap-2.5 px-6 py-6">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-40 w-full rounded-[var(--radius-md)]" />
            <Skeleton className="h-40 w-full rounded-[var(--radius-md)]" />
          </div>
        </div>
      </aside>
    );
  }

  if (sidebar.contactError || !sidebar.contact) {
    return (
      <aside className={cn(INBOX_DETAILS_PANEL_CLASS, className)}>
        <DetailsPaneHeader />
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-sm">
          <p className="text-muted-foreground">Contact not found.</p>
          <Link
            href={`/business/contacts/${contactId}`}
            className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
          >
            Open contact
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <>
      <ConversationDetailsSidebar
        contact={sidebar.contact}
        onViewFullProfile={sidebar.onViewFullProfile}
        onAddCreditCard={sidebar.onAddCreditCard}
        className={cn("h-full w-full", className)}
      />

      <ContactFullProfileDrawer
        open={sidebar.fullProfileOpen}
        onOpenChange={sidebar.setFullProfileOpen}
        contactId={contactId}
        initialSection={sidebar.profileSection}
      />
    </>
  );
}
