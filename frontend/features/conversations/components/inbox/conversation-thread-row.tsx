"use client";

import { formatRelativeTime } from "@/lib/ui/relative-time";
import { IntegrationProviderIcon } from "@/features/integrations/components/integration-provider-icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/features/conversations/api/conversations.api";
import {
  channelProviderKey,
  contactDisplayName,
  initials,
} from "@/features/conversations/components/inbox/conversation-inbox-utils";

export function ConversationThreadRow({
  conversation,
  selectedId,
  onSelect,
}: {
  conversation: Conversation;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const name = contactDisplayName(conversation);
  const active = conversation.id === selectedId;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        className={cn(
          "flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50",
          active && "bg-muted/60",
        )}
      >
        <Avatar className="size-10 shrink-0">
          <AvatarImage src={conversation.contact?.avatarUrl ?? undefined} />
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{name}</span>
            {conversation.lastMessageAt ? (
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatRelativeTime(conversation.lastMessageAt)}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <IntegrationProviderIcon
              providerKey={channelProviderKey(conversation.channel)}
              size="sm"
              className="!size-4 shrink-0"
            />
            <span className="truncate text-xs text-muted-foreground">
              {conversation.lastMessagePreview ?? "No messages"}
            </span>
          </div>
        </div>
        {conversation.unreadCount > 0 ? (
          <Badge className="h-5 min-w-5 justify-center px-1.5 text-[10px]">
            {conversation.unreadCount}
          </Badge>
        ) : null}
      </button>
    </li>
  );
}
