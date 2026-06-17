"use client";

import { formatRelativeTime } from "@/lib/ui/relative-time";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UnifiedConversationThread } from "@/features/conversations/api/conversations.api";
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
        <ProfileAvatar
          name={name}
          avatarUrl={thread.contact?.avatarUrl}
          className="size-10"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-medium">{name}</span>
            {thread.lastMessageAt ? (
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatRelativeTime(thread.lastMessageAt)}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {previewText ?? "No messages"}
          </p>
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
