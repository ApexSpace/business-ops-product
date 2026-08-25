"use client";

import { useEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  formatMessageDateSeparator,
  formatMessageTime,
  formatRelativeTime,
  isSameMessageDay,
} from "@/lib/ui/relative-time";
import type { ConversationNote } from "@/features/conversations/api/conversation-notes.api";
import type { ConversationMessage } from "@/features/conversations/api/conversations.api";
import { ConversationChannelGlyph } from "@/features/conversations/components/inbox/conversation-channel-display";
import { MessageDeliveryStatus } from "@/features/conversations/components/message-delivery-status";
import { displayInboundEmailBody } from "@/features/conversations/utils/email-reply-body";
import {
  isImageAttachment,
  parseMessageAttachments,
} from "@/features/conversations/utils/message-attachments";
import { isConversationActivityMessage } from "@/features/conversations/utils/conversation-activity.util";
import { isDeletableConversationMessage } from "@/features/conversations/utils/message-delete.util";
import { buildThreadTimeline } from "@/features/conversations/utils/thread-timeline";

const NEAR_BOTTOM_THRESHOLD_PX = 120;

export type MessageListThreadContext = {
  contactName: string;
  contactAvatarUrl?: string | null;
  businessName?: string | null;
};

type VirtualizedMessageListProps = {
  messages: ConversationMessage[];
  /** Staff-only internal notes, interleaved into the thread timeline. */
  notes?: ConversationNote[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  variant?: "default" | "thread";
  threadContext?: MessageListThreadContext;
  /** Resets scroll anchoring when the active thread/conversation changes. */
  scrollKey?: string | null;
  messageDeleteMode?: boolean;
  onRequestDeleteMessage?: (message: ConversationMessage) => void;
  onRetryMessage?: (message: ConversationMessage) => void;
  retryingMessageId?: string | null;
  canRetryMessages?: boolean;
};

export function VirtualizedMessageList({
  messages,
  notes = [],
  onLoadMore,
  hasMore,
  isLoadingMore,
  variant = "default",
  threadContext,
  scrollKey = null,
  messageDeleteMode = false,
  onRequestDeleteMessage,
  onRetryMessage,
  retryingMessageId = null,
  canRetryMessages = true,
}: VirtualizedMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const timeline = useMemo(
    () =>
      variant === "thread"
        ? buildThreadTimeline(messages, notes)
        : messages.map((message) => ({
            kind: "message" as const,
            id: `message:${message.id}`,
            createdAt: message.createdAt,
            message,
          })),
    [messages, notes, variant],
  );
  const previousCountRef = useRef(timeline.length);
  const paginationReadyRef = useRef(false);
  const loadMoreLockRef = useRef(false);

  const virtualizer = useVirtualizer({
    count: timeline.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (variant === "thread" ? 148 : 72),
    overscan: 8,
  });

  const items = virtualizer.getVirtualItems();

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) return;

    const handleScroll = () => {
      isNearBottomRef.current =
        parent.scrollHeight - parent.scrollTop - parent.clientHeight <
        NEAR_BOTTOM_THRESHOLD_PX;
    };

    handleScroll();
    parent.addEventListener("scroll", handleScroll, { passive: true });
    return () => parent.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    paginationReadyRef.current = false;
    loadMoreLockRef.current = false;
    isNearBottomRef.current = true;
    previousCountRef.current = 0;
  }, [scrollKey]);

  useEffect(() => {
    if (timeline.length === 0 || paginationReadyRef.current) return;

    const frame = requestAnimationFrame(() => {
      virtualizer.scrollToIndex(timeline.length - 1, { align: "end" });
      requestAnimationFrame(() => {
        const parent = parentRef.current;
        if (parent) {
          parent.scrollTop = parent.scrollHeight;
        }
        paginationReadyRef.current = true;
        isNearBottomRef.current = true;
        previousCountRef.current = timeline.length;
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [scrollKey, timeline.length, timeline[timeline.length - 1]?.id, virtualizer]);

  useEffect(() => {
    const grew = timeline.length > previousCountRef.current;
    const prepended =
      grew &&
      paginationReadyRef.current &&
      !isNearBottomRef.current;
    previousCountRef.current = timeline.length;

    if (!grew || timeline.length === 0) {
      return;
    }

    if (prepended) {
      return;
    }

    if (!isNearBottomRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      virtualizer.scrollToIndex(timeline.length - 1, { align: "end" });
    });
  }, [timeline.length, virtualizer]);

  useEffect(() => {
    if (!isLoadingMore) {
      loadMoreLockRef.current = false;
    }
  }, [isLoadingMore]);

  return (
    <div
      ref={parentRef}
      className={cn(
        "scrollbar-thin h-full min-h-0 overflow-y-auto",
        variant === "thread" ? "px-6 py-6" : "px-1",
      )}
      onScroll={(e) => {
        const el = e.currentTarget;
        if (
          paginationReadyRef.current &&
          hasMore &&
          !isLoadingMore &&
          !loadMoreLockRef.current &&
          el.scrollTop < 80 &&
          onLoadMore
        ) {
          loadMoreLockRef.current = true;
          onLoadMore();
        }
      }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {items.map((virtualRow) => {
          const entry = timeline[virtualRow.index];
          const previousEntry =
            virtualRow.index > 0 ? timeline[virtualRow.index - 1] : null;
          const showDateSeparator =
            variant === "thread" &&
            (!previousEntry ||
              !isSameMessageDay(previousEntry.createdAt, entry.createdAt));

          return (
            <div
              key={entry.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={cn(variant === "thread" ? "px-0 py-3" : "px-2 py-1.5")}
            >
              {showDateSeparator ? (
                <DateSeparator
                  label={formatMessageDateSeparator(entry.createdAt)}
                />
              ) : null}
              {entry.kind === "note" ? (
                <InternalNoteBubble note={entry.note} />
              ) : variant === "thread" && threadContext ? (
                isConversationActivityMessage(entry.message) ? (
                  <ActivityTimelineRow message={entry.message} />
                ) : (
                  <ThreadMessageBubble
                    message={entry.message}
                    threadContext={threadContext}
                    deleteMode={messageDeleteMode}
                    onRequestDelete={onRequestDeleteMessage}
                    onRetry={onRetryMessage}
                    isRetrying={retryingMessageId === entry.message.id}
                    canRetry={canRetryMessages}
                  />
                )
              ) : (
                <MessageBubble
                  message={entry.message}
                  onRetry={onRetryMessage}
                  isRetrying={retryingMessageId === entry.message.id}
                  canRetry={canRetryMessages}
                />
              )}
            </div>
          );
        })}
      </div>
      {isLoadingMore ? (
        <p className="py-2 text-center text-xs text-muted-foreground">
          Loading older messages…
        </p>
      ) : null}
    </div>
  );
}

function isInboundEmailMessage(message: ConversationMessage): boolean {
  return (
    message.direction === "INBOUND" &&
    (message.channel === "EMAIL" || message.providerKey === "email")
  );
}

function getEmptyMessageFallback(message: ConversationMessage): string {
  if (isInboundEmailMessage(message)) {
    return "(Email reply)";
  }
  if (
    message.channel === "WHATSAPP" &&
    message.direction === "OUTBOUND" &&
    !message.text?.trim()
  ) {
    return "Template message";
  }
  return "[Attachment]";
}

function isWhatsAppTemplateMessage(message: ConversationMessage): boolean {
  const text = message.text?.trim() ?? "";
  return (
    message.channel === "WHATSAPP" &&
    (text.startsWith("Template:") || (!text && message.direction === "OUTBOUND"))
  );
}

function messageDisplayText(message: ConversationMessage): string | null {
  if (isInboundEmailMessage(message)) {
    return displayInboundEmailBody(message.text);
  }

  const text = message.text?.trim();
  if (text) {
    if (text.startsWith("Template:")) {
      return text.replace(/^Template:\s*/, "");
    }
    return text;
  }

  return null;
}

function parseTemplateDisplay(message: ConversationMessage): {
  templateName: string;
  body?: string;
} | null {
  if (!isWhatsAppTemplateMessage(message)) {
    return null;
  }

  const text = message.text?.trim() ?? "";
  if (text.startsWith("Template:")) {
    const templateName = text.replace(/^Template:\s*/, "").trim();
    return {
      templateName: templateName || "Template message",
    };
  }

  if (!text) {
    return { templateName: "Template message" };
  }

  return null;
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="mb-6 flex items-center justify-center">
      <span className="rounded-full bg-violet-primary-surface px-3 py-0.5 text-xs font-medium text-violet-primary-normal">
        {label}
      </span>
    </div>
  );
}

function noteAuthorLabel(note: ConversationNote): string {
  const name = [note.author.firstName, note.author.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || note.author.email;
}

function InternalNoteBubble({ note }: { note: ConversationNote }) {
  return (
    <div className="flex justify-center">
      <div
        className="flex w-full max-w-[min(90%,36rem)] flex-col gap-1.5 rounded-[var(--radius-xl)] border border-warning/25 bg-warning-subtle px-3.5 py-2.5"
        role="note"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold tracking-wide text-warning uppercase">
            Internal Note
          </p>
          <p className="text-[11px] text-muted-foreground">
            {noteAuthorLabel(note)} · {formatMessageTime(note.createdAt)}
          </p>
        </div>
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground">
          {note.body}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Not visible to the client
        </p>
      </div>
    </div>
  );
}

function MessageAvatar({
  name,
  avatarUrl,
  outbound,
}: {
  name: string;
  avatarUrl?: string | null;
  outbound: boolean;
}) {
  if (outbound) {
    return (
      <ProfileAvatar
        name={name}
        className="size-8"
        fallbackClassName="bg-violet-primary-surface text-[11px] font-semibold text-violet-primary-normal"
      />
    );
  }

  return (
    <ProfileAvatar
      name={name}
      avatarUrl={avatarUrl}
      className="size-8"
      fallbackClassName="bg-[var(--drawer-avatar-bg)] text-[11px] font-semibold text-[var(--drawer-avatar-fg)]"
    />
  );
}

function outboundSenderLabel(
  message: ConversationMessage,
  _businessName?: string | null,
): string {
  if (message.senderType === "SYSTEM") return "Bot";
  if (message.senderType === "AI_AGENT") return "AI Assistant";
  return "Staff (You)";
}

function ActivityTimelineRow({ message }: { message: ConversationMessage }) {
  const label = message.text?.trim() || "Activity";
  return (
    <div className="flex justify-center px-4 py-1" role="status">
      <p className="max-w-[90%] text-center text-[11px] leading-snug text-muted-foreground">
        {label}
        <span className="text-muted-foreground/70">
          {" "}
          · {formatRelativeTime(message.createdAt)}
        </span>
      </p>
    </div>
  );
}

function FailedMessageRetryButton({
  onRetry,
  isRetrying,
  disabled,
}: {
  onRetry?: () => void;
  isRetrying?: boolean;
  disabled?: boolean;
}) {
  if (!onRetry) return null;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[11px] font-medium text-destructive transition-colors",
        "hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30",
        (disabled || isRetrying) && "pointer-events-none opacity-60",
      )}
      aria-label="Retry sending message"
      disabled={disabled || isRetrying}
      onClick={(event) => {
        event.stopPropagation();
        onRetry();
      }}
    >
      <RefreshCw className={cn("size-3", isRetrying && "animate-spin")} />
      <span>{isRetrying ? "Retrying…" : "Retry"}</span>
    </button>
  );
}

function ThreadMessageBubble({
  message,
  threadContext,
  deleteMode = false,
  onRequestDelete,
  onRetry,
  isRetrying = false,
  canRetry = true,
}: {
  message: ConversationMessage;
  threadContext: MessageListThreadContext;
  deleteMode?: boolean;
  onRequestDelete?: (message: ConversationMessage) => void;
  onRetry?: (message: ConversationMessage) => void;
  isRetrying?: boolean;
  canRetry?: boolean;
}) {
  const outbound = message.direction === "OUTBOUND";
  const failed = message.status === "FAILED";
  const attachments = parseMessageAttachments(message.attachments);
  const displayText = messageDisplayText(message);
  const templateDisplay = parseTemplateDisplay(message);
  const senderName = outbound
    ? outboundSenderLabel(message, threadContext.businessName)
    : threadContext.contactName;
  const avatarUrl = outbound ? null : threadContext.contactAvatarUrl;
  const canDelete = isDeletableConversationMessage(message);
  const showRetry = failed && canRetry && Boolean(onRetry) && !deleteMode;

  return (
    <div
      className={cn(
        "group/message flex w-full flex-col gap-1.5",
        outbound ? "items-end" : "items-start",
      )}
    >
      {outbound ? (
        <div className="flex max-w-[min(78%,34rem)] items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col items-end gap-1.5">
            <p className="flex flex-wrap items-center justify-end gap-1.5 px-0.5 text-[11px] text-muted-foreground">
              <ConversationChannelGlyph channel={message.channel} />
              <span className="tabular-nums">
                {formatMessageTime(message.createdAt)}
              </span>
              <span className="font-medium text-foreground">{senderName}</span>
            </p>
            <div className="flex w-full items-start justify-end gap-2">
              {deleteMode ? (
                <button
                  type="button"
                  className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  aria-label={
                    canDelete
                      ? "Delete message"
                      : "Automated message cannot be deleted"
                  }
                  onClick={() => onRequestDelete?.(message)}
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
              <div
                className={cn(
                  "min-w-0 rounded-[var(--radius-xl)] px-3.5 py-2.5 text-sm shadow-none",
                  failed
                    ? "border border-destructive/40 bg-destructive/8 text-destructive"
                    : "bg-violet-primary-normal text-white",
                )}
              >
                <MessageBody
                  message={message}
                  attachments={attachments}
                  displayText={displayText}
                  templateDisplay={templateDisplay}
                  variant="thread"
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-0.5 text-[11px] tabular-nums text-muted-foreground">
              {failed ? (
                <span
                  className="text-destructive"
                  title={message.errorMessage ?? undefined}
                >
                  Failed to send
                </span>
              ) : (
                <MessageDeliveryStatus
                  status={message.status}
                  showLabel
                />
              )}
              {showRetry ? (
                <FailedMessageRetryButton
                  onRetry={() => onRetry?.(message)}
                  isRetrying={isRetrying}
                />
              ) : null}
              {!deleteMode && onRequestDelete ? (
                <MessageOptionsMenu
                  align="end"
                  onDelete={() => onRequestDelete(message)}
                />
              ) : null}
            </div>
          </div>
          <MessageAvatar
            name={senderName}
            avatarUrl={avatarUrl}
            outbound={outbound}
          />
        </div>
      ) : (
        <div className="flex max-w-[min(78%,34rem)] flex-col items-start gap-1.5">
          <div className="flex items-center gap-2">
            <MessageAvatar
              name={senderName}
              avatarUrl={avatarUrl}
              outbound={outbound}
            />
            <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{senderName}</span>
              <span className="tabular-nums">
                {formatMessageTime(message.createdAt)}
              </span>
              <ConversationChannelGlyph channel={message.channel} />
            </p>
          </div>
          <div className="flex w-full items-start gap-2 ps-10">
            {deleteMode ? (
              <button
                type="button"
                className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                aria-label={
                  canDelete
                    ? "Delete message"
                    : "Automated message cannot be deleted"
                }
                onClick={() => onRequestDelete?.(message)}
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
            <div
              className={cn(
                "min-w-0 rounded-[var(--radius-xl)] border px-3.5 py-2.5 text-sm shadow-none",
                failed
                  ? "border-destructive/40 bg-destructive/8 text-destructive"
                  : "border-border bg-white text-foreground",
              )}
            >
              <MessageBody
                message={message}
                attachments={attachments}
                displayText={displayText}
                templateDisplay={templateDisplay}
                variant="thread"
              />
            </div>
          </div>
          {!deleteMode && onRequestDelete ? (
            <div className="flex items-center gap-1.5 ps-10">
              <MessageOptionsMenu
                align="start"
                onDelete={() => onRequestDelete(message)}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function MessageOptionsMenu({
  align,
  onDelete,
}: {
  align: "start" | "end";
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="inline-flex size-5 items-center justify-center rounded-md text-muted-foreground/70 opacity-0 transition-opacity hover:bg-muted/60 hover:text-foreground group-hover/message:opacity-100 data-[popup-open]:opacity-100"
            aria-label="Message options"
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        }
      />
      <DropdownMenuContent align={align} className="min-w-36">
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MessageBody({
  message,
  attachments,
  displayText,
  templateDisplay = null,
  variant = "default",
}: {
  message: ConversationMessage;
  attachments: ReturnType<typeof parseMessageAttachments>;
  displayText: string | null;
  templateDisplay?: ReturnType<typeof parseTemplateDisplay>;
  variant?: "default" | "thread";
}) {
  const isTemplate = Boolean(templateDisplay);
  const isThread = variant === "thread";

  return (
    <div className={cn(isThread && "space-y-2", isThread && "text-inherit")}>
      {isTemplate && templateDisplay ? (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-current/75">
            Template
          </p>
          <p className="font-medium leading-snug text-sm">
            {templateDisplay.templateName}
          </p>
          {templateDisplay.body ? (
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-current/90">
              {templateDisplay.body}
            </p>
          ) : null}
        </div>
      ) : null}
      {attachments.length > 0 ? (
        <div className="space-y-2">
          {attachments.map((attachment, index) => {
            if (isImageAttachment(attachment) && attachment.url) {
              return (
                <a
                  key={`${message.id}-attachment-${index}`}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-lg ring-1 ring-border/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={attachment.url}
                    alt={attachment.title ?? "Image attachment"}
                    className="max-h-64 w-full object-cover"
                  />
                </a>
              );
            }

            if (attachment.url) {
              return (
                <a
                  key={`${message.id}-attachment-${index}`}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm text-primary underline-offset-2 hover:underline"
                >
                  {attachment.title ?? `${attachment.type} attachment`}
                </a>
              );
            }

            return (
              <p key={`${message.id}-attachment-${index}`}>
                [{attachment.type}]
              </p>
            );
          })}
        </div>
      ) : null}
      {!isTemplate && displayText ? (
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-inherit">
          {displayText}
        </p>
      ) : null}
      {!isTemplate && !displayText && attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {getEmptyMessageFallback(message)}
        </p>
      ) : null}
    </div>
  );
}

function MessageBubble({
  message,
  onRetry,
  isRetrying = false,
  canRetry = true,
}: {
  message: ConversationMessage;
  onRetry?: (message: ConversationMessage) => void;
  isRetrying?: boolean;
  canRetry?: boolean;
}) {
  const outbound = message.direction === "OUTBOUND";
  const failed = message.status === "FAILED";
  const attachments = parseMessageAttachments(message.attachments);
  const displayText = messageDisplayText(message);
  const templateDisplay = parseTemplateDisplay(message);
  const showRetry = failed && canRetry && Boolean(onRetry);

  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
          outbound
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
          failed &&
            "border border-destructive/50 bg-destructive/10 text-destructive",
        )}
      >
        <MessageBody
          message={message}
          attachments={attachments}
          displayText={displayText}
          templateDisplay={templateDisplay}
        />
        <p
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70",
            outbound ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          <span>{formatRelativeTime(message.createdAt)}</span>
          {failed ? (
            <span title={message.errorMessage ?? undefined}>· Failed to send</span>
          ) : null}
          {showRetry ? (
            <FailedMessageRetryButton
              onRetry={() => onRetry?.(message)}
              isRetrying={isRetrying}
            />
          ) : null}
          {outbound && !failed ? (
            <MessageDeliveryStatus status={message.status} />
          ) : null}
        </p>
      </div>
    </div>
  );
}
