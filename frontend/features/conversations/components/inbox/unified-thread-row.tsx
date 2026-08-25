"use client";

import { formatCompactRelativeTime } from "@/lib/ui/relative-time";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { StatusPill } from "@/components/data-display/status-pill";
import { WORKSPACE_ACTIVE_ROW_CLASS } from "@/lib/design/workspace-tokens";
import { cn } from "@/lib/utils";
import {
  channelLabel,
  type ConversationStatus,
  type UnifiedConversationThread,
} from "@/features/conversations/api/conversations.api";
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
  const pill = statusPill(thread.status);
  const metaParts = [
    primaryChannel ? channelLabel(primaryChannel) : null,
    thread.lastMessageAt
      ? formatCompactRelativeTime(thread.lastMessageAt)
      : null,
  ].filter(Boolean);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => onSelect(thread)}
        className={cn(
          "flex w-full items-start gap-3 px-6 py-3 text-left transition-colors hover:bg-violet-primary-surface/60",
          active && cn("bg-violet-primary-surface", WORKSPACE_ACTIVE_ROW_CLASS),
        )}
      >
        <ProfileAvatar
          name={name}
          avatarUrl={thread.contact?.avatarUrl}
          size="default"
          fallbackClassName="bg-[var(--drawer-avatar-bg)] text-caption font-semibold text-[var(--drawer-avatar-fg)]"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 truncate text-body-small font-semibold text-foreground">
              {name}
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <StatusPill label={pill.label} variant={pill.variant} />
              {thread.unreadCount > 0 ? (
                <span className="inline-flex size-5 min-w-5 items-center justify-center rounded-full bg-violet-primary-normal px-1.5 text-caption font-medium text-white">
                  {thread.unreadCount}
                </span>
              ) : null}
            </div>
          </div>
          <p className="line-clamp-2 text-caption font-normal text-muted-foreground">
            {previewText ?? "No messages"}
          </p>
          {metaParts.length > 0 ? (
            <p className="text-caption font-normal text-muted-foreground">
              {metaParts.join(" | ")}
            </p>
          ) : null}
        </div>
      </button>
    </div>
  );
}
