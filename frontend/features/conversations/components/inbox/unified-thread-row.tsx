"use client";

import { formatRelativeTime } from "@/lib/ui/relative-time";
import { IntegrationProviderIcon } from "@/features/integrations/components/integration-provider-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UnifiedConversationThread } from "@/features/conversations/api/conversations.api";
import {
  channelProviderKey,
  initials,
} from "@/features/conversations/components/inbox/conversation-inbox-utils";
import { unifiedThreadDisplayName } from "@/features/conversations/utils/unified-thread.utils";
import { displayInboundEmailBody } from "@/features/conversations/utils/email-reply-body";

export function UnifiedThreadRow({
  thread,
  selectedThreadKey,
  onSelect,
}: {
  thread: UnifiedConversationThread;
  selectedThreadKey: string | null;
  onSelect: (thread: UnifiedConversationThread) => void;
}) {
  const name = unifiedThreadDisplayName(thread);
  const active = thread.threadKey === selectedThreadKey;
  const previewText =
    thread.channels.includes("EMAIL") && thread.lastMessagePreview
      ? (displayInboundEmailBody(thread.lastMessagePreview) ??
        thread.lastMessagePreview)
      : thread.lastMessagePreview;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(thread)}
        className={cn(
          "flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50",
          active && "bg-muted/60",
        )}
      >
        <Avatar className="size-10 shrink-0">
          <AvatarImage src={thread.contact?.avatarUrl ?? undefined} />
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{name}</span>
            {thread.lastMessageAt ? (
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatRelativeTime(thread.lastMessageAt)}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <div className="flex shrink-0 items-center -space-x-1">
              {thread.channels.map((channel) => (
                <span
                  key={`${thread.threadKey}-${channel}`}
                  className="inline-flex rounded-full bg-background ring-1 ring-border/80"
                >
                  <IntegrationProviderIcon
                    providerKey={channelProviderKey(channel)}
                    size="sm"
                    className="!size-4"
                  />
                </span>
              ))}
            </div>
            <span className="truncate text-xs text-muted-foreground">
              {previewText ?? "No messages"}
            </span>
          </div>
        </div>
        {thread.unreadCount > 0 ? (
          <Badge className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
            {thread.unreadCount}
          </Badge>
        ) : null}
      </button>
    </li>
  );
}
