"use client";

import { formatRelativeTime } from "@/lib/ui/relative-time";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { StatusPill } from "@/components/data-display/status-pill";
import { cn } from "@/lib/utils";
import {
  channelLabel,
  type ConversationStatus,
  type UnifiedConversationThread,
} from "@/features/conversations/api/conversations.api";
import { getConversationChannelIcon } from "@/features/conversations/components/inbox/conversation-channel-display";
import { unifiedThreadDisplayName } from "@/features/conversations/utils/unified-thread.utils";
import { displayInboundEmailBody } from "@/features/conversations/utils/email-reply-body";
import type { StatusPillVariant } from "@/components/data-display/status-pill";

function statusPill(status: ConversationStatus): {
  label: string;
  variant: StatusPillVariant;
} {
  switch (status) {
    case "CLOSED":
      return { label: "Closed", variant: "warning" };
    case "SPAM":
      return { label: "Spam", variant: "danger" };
    case "PENDING":
      return { label: "Pending", variant: "info" };
    default:
      return { label: "Open", variant: "success" };
  }
}

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
  const primaryChannel = thread.channels[0];
  const ChannelIcon = primaryChannel
    ? getConversationChannelIcon(primaryChannel)
    : null;
  const pill = statusPill(thread.status);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(thread)}
        className={cn(
          "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
          active && "bg-primary/5",
        )}
      >
        <ProfileAvatar
          name={name}
          avatarUrl={thread.contact?.avatarUrl}
          className="size-10"
          fallbackClassName="bg-primary/10 text-xs font-semibold text-primary"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold">{name}</span>
            {thread.lastMessageAt ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatRelativeTime(thread.lastMessageAt)}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {previewText ?? "No messages"}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            {ChannelIcon && primaryChannel ? (
              <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                <ChannelIcon className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{channelLabel(primaryChannel)}</span>
              </span>
            ) : null}
            <StatusPill label={pill.label} variant={pill.variant} />
            {thread.unreadCount > 0 ? (
              <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                {thread.unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </li>
  );
}
