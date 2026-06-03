"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatRelativeTime } from "@/lib/relative-time";
import { MessageSquare } from "lucide-react";
import { channelLabel, listConversationsByContact } from "@/lib/conversations";
import { queryKeys } from "@/lib/query-keys";
import { WORKSPACE_PANEL_CLASS } from "@/lib/contact-workspace";
import { cn } from "@/lib/utils";

interface ContactConversationPanelProps {
  contactId: string;
  contactName: string;
  className?: string;
}

export function ContactConversationPanel({
  contactId,
  contactName,
  className,
}: ContactConversationPanelProps) {
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: queryKeys.conversations.byContact(contactId),
    queryFn: () => listConversationsByContact(contactId),
  });

  return (
    <section className={cn(WORKSPACE_PANEL_CLASS, className)}>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Conversations</h2>
          <Link
            href="/business/conversations"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            Open inbox
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : conversations.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <MessageSquare className="size-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              No conversations yet for {contactName}.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <Link
                  href={`/business/conversations?conversation=${conversation.id}`}
                  className="block rounded-lg border border-border/70 bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {channelLabel(conversation.channel)}
                    </span>
                    {conversation.lastMessageAt ? (
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(conversation.lastMessageAt)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {conversation.lastMessagePreview ?? "No messages"}
                  </p>
                  {conversation.unreadCount > 0 ? (
                    <p className="mt-1 text-xs font-medium text-primary">
                      {conversation.unreadCount} unread
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
