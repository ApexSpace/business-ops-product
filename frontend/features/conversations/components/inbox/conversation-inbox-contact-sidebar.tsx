"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ContactActionRail } from "@/features/contacts/components/contact-workspace/contact-action-rail";
import { ContactSidebarPanel } from "@/features/contacts/components/contact-workspace/contact-sidebar-panel";
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

type ConversationInboxContactSidebarPart = "sidebar" | "rail" | "both";

interface ConversationInboxContactSidebarProps {
  selected: Conversation | undefined;
  selectedThread?: UnifiedConversationThread;
  sidebarState: ConversationInboxContactSidebarState;
  part?: ConversationInboxContactSidebarPart;
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

function ConversationInboxContactSidebarContent({
  sidebar,
}: {
  sidebar: ConversationInboxContactSidebarState;
}) {
  return (
    <ContactSidebarPanel
      contact={sidebar.contact!}
      labels={sidebar.labels}
      businessTimezone={sidebar.business?.timezone ?? undefined}
      activeSection={sidebar.activeSection}
      leads={sidebar.leads}
      workItems={sidebar.workItems}
      notes={sidebar.notes}
      tasks={sidebar.tasks}
      appointments={sidebar.appointments}
      leadsLoading={sidebar.leadsLoading}
      workItemsLoading={sidebar.workItemsLoading}
      notesLoading={sidebar.notesLoading}
      tasksLoading={sidebar.tasksLoading}
      appointmentsLoading={sidebar.appointmentsLoading}
      canDeleteLead={sidebar.canDeleteLead}
      onEdit={sidebar.onEditContact}
      onDelete={sidebar.onDeleteContact}
      showDeleteButton={false}
      avatarEditOnHover
      onCreateLead={sidebar.onCreateLead}
      onCreateWorkItem={sidebar.onCreateWorkItem}
      onCreateNote={sidebar.onCreateNote}
      onCreateTask={sidebar.onCreateTask}
      onCreateAppointment={sidebar.onCreateAppointment}
      onEditLead={sidebar.onEditLead}
      onDeleteLead={sidebar.onDeleteLead}
      onEditWorkItem={sidebar.onEditWorkItem}
      onDeleteWorkItem={sidebar.onDeleteWorkItem}
      onEditNote={sidebar.onEditNote}
      onDeleteNote={sidebar.onDeleteNote}
      onEditTask={sidebar.onEditTask}
      onDeleteTask={sidebar.onDeleteTask}
      onCompleteTask={sidebar.onCompleteTask}
      onReopenTask={sidebar.onReopenTask}
      onEditAppointment={sidebar.onEditAppointment}
      onDeleteAppointment={sidebar.onDeleteAppointment}
      estimates={sidebar.estimates}
      invoices={sidebar.invoices}
      payments={sidebar.payments}
      financialLoading={sidebar.financialLoading}
      className="min-h-0 h-full flex-1"
    />
  );
}

export function ConversationInboxContactSidebar({
  selected,
  selectedThread,
  sidebarState: sidebar,
  part = "both",
  className,
}: ConversationInboxContactSidebarProps) {
  const contactId = selectedThread?.contactId ?? selected?.contactId ?? null;

  if (part === "rail") {
    if (!selected || !contactId || sidebar.contactLoading || !sidebar.contact) {
      return (
        <ContactActionRail
          activeSection={sidebar.activeSection}
          onSelect={sidebar.handleRailSelect}
          className={cn("h-full w-full min-w-0", className)}
        />
      );
    }

    return (
      <ContactActionRail
        activeSection={sidebar.activeSection}
        onSelect={sidebar.handleRailSelect}
        className={cn("h-full w-full min-w-0", className)}
      />
    );
  }

  if (!selected) {
    if (part === "sidebar") {
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
    return null;
  }

  if (!contactId) {
    if (part === "sidebar") {
      return (
        <ConversationInboxContactFallback
          selected={selected}
          selectedThread={selectedThread}
        />
      );
    }
    return null;
  }

  if (sidebar.contactLoading) {
    if (part === "sidebar") {
      return <Skeleton className={cn("h-full rounded-2xl", className)} />;
    }
    return (
      <div className={cn("flex h-full min-h-0 gap-1.5", className)}>
        <Skeleton className="h-full min-w-0 flex-1 rounded-2xl" />
        <Skeleton className="h-full w-11 shrink-0 rounded-2xl" />
      </div>
    );
  }

  if (sidebar.contactError || !sidebar.contact) {
    if (part === "sidebar") {
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
    return null;
  }

  const sidebarPanel = (
    <ConversationInboxContactSidebarContent sidebar={sidebar} />
  );

  const railPanel = (
    <ContactActionRail
      activeSection={sidebar.activeSection}
      onSelect={sidebar.handleRailSelect}
      className="h-full w-full min-w-0"
    />
  );

  if (part === "sidebar") {
    return (
      <TooltipProvider>
        <div className={cn("h-full min-h-0 w-full", className)}>{sidebarPanel}</div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("flex h-full min-h-0 items-stretch gap-1.5", className)}>
        <div className="min-h-0 min-w-0 flex-1">{sidebarPanel}</div>
        <div className="w-11 shrink-0">{railPanel}</div>
      </div>
    </TooltipProvider>
  );
}
