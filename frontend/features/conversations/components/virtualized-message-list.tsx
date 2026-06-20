"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MoreHorizontal } from "lucide-react";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { cn } from "@/lib/utils";
import {
  formatMessageDateSeparator,
  formatMessageTime,
  formatRelativeTime,
  isSameMessageDay,
} from "@/lib/ui/relative-time";
import type { ConversationMessage } from "@/features/conversations/api/conversations.api";
import { MessageDeliveryStatus } from "@/features/conversations/components/message-delivery-status";
import { displayInboundEmailBody } from "@/features/conversations/utils/email-reply-body";
import {
  isImageAttachment,
  parseMessageAttachments,
} from "@/features/conversations/utils/message-attachments";

const NEAR_BOTTOM_THRESHOLD_PX = 120;

export type MessageListThreadContext = {
  contactName: string;
  contactAvatarUrl?: string | null;
  businessName?: string | null;
};

type VirtualizedMessageListProps = {
  messages: ConversationMessage[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  variant?: "default" | "thread";
  threadContext?: MessageListThreadContext;
  /** Resets scroll anchoring when the active thread/conversation changes. */
  scrollKey?: string | null;
};

export function VirtualizedMessageList({
  messages,
  onLoadMore,
  hasMore,
  isLoadingMore,
  variant = "default",
  threadContext,
  scrollKey = null,
}: VirtualizedMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const previousCountRef = useRef(messages.length);
  const paginationReadyRef = useRef(false);
  const loadMoreLockRef = useRef(false);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (variant === "thread" ? 132 : 72),
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
    if (messages.length === 0 || paginationReadyRef.current) return;

    const frame = requestAnimationFrame(() => {
      virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
      requestAnimationFrame(() => {
        const parent = parentRef.current;
        if (parent) {
          parent.scrollTop = parent.scrollHeight;
        }
        paginationReadyRef.current = true;
        isNearBottomRef.current = true;
        previousCountRef.current = messages.length;
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [scrollKey, messages.length, messages[messages.length - 1]?.id, virtualizer]);

  useEffect(() => {
    const grew = messages.length > previousCountRef.current;
    const prepended =
      grew &&
      paginationReadyRef.current &&
      !isNearBottomRef.current;
    previousCountRef.current = messages.length;

    if (!grew || messages.length === 0) {
      return;
    }

    if (prepended) {
      return;
    }

    if (!isNearBottomRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
    });
  }, [messages.length, virtualizer]);

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
        variant === "thread" ? "px-4 py-3" : "px-1",
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
          const message = messages[virtualRow.index];
          const previousMessage =
            virtualRow.index > 0 ? messages[virtualRow.index - 1] : null;
          const showDateSeparator =
            variant === "thread" &&
            (!previousMessage ||
              !isSameMessageDay(
                previousMessage.createdAt,
                message.createdAt,
              ));

          return (
            <div
              key={message.id}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={cn(variant === "thread" ? "px-0 py-2.5" : "px-2 py-1.5")}
            >
              {showDateSeparator ? (
                <DateSeparator label={formatMessageDateSeparator(message.createdAt)} />
              ) : null}
              {variant === "thread" && threadContext ? (
                <ThreadMessageBubble
                  message={message}
                  threadContext={threadContext}
                />
              ) : (
                <MessageBubble message={message} />
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
    <div className="mb-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-border/50" />
      <span className="shrink-0 rounded-full border border-border/60 bg-muted/30 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <div className="h-px flex-1 bg-border/50" />
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
        className="mt-0.5 size-8"
        fallbackClassName="bg-primary/12 text-[11px] font-semibold text-primary"
      />
    );
  }

  return (
    <ProfileAvatar
      name={name}
      avatarUrl={avatarUrl}
      className="mt-0.5 size-8"
      fallbackClassName="bg-muted text-[11px] font-semibold text-foreground"
    />
  );
}

function outboundSenderLabel(
  message: ConversationMessage,
  businessName?: string | null,
): string {
  if (message.senderType === "SYSTEM") return "Bot";
  if (message.senderType === "AI_AGENT") return "AI Assistant";
  return businessName?.trim() || "You";
}

function ThreadMessageBubble({
  message,
  threadContext,
}: {
  message: ConversationMessage;
  threadContext: MessageListThreadContext;
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

  return (
    <div
      className={cn(
        "group/message flex gap-3",
        outbound ? "flex-row-reverse" : "flex-row",
      )}
    >
      <MessageAvatar
        name={senderName}
        avatarUrl={avatarUrl}
        outbound={outbound}
      />
      <div
        className={cn(
          "flex min-w-0 max-w-[min(78%,540px)] flex-col gap-1.5",
          outbound ? "items-end" : "items-start",
        )}
      >
        <p
          className={cn(
            "px-0.5 text-[11px] font-medium tracking-wide text-muted-foreground",
            outbound ? "text-right" : "text-left",
          )}
        >
          {senderName}
        </p>
        <div
          className={cn(
            "w-full rounded-xl border px-3.5 py-2.5 text-sm shadow-elevation-xs",
            outbound
              ? "border-primary/15 bg-primary/[0.06]"
              : "border-border/60 bg-card",
            failed &&
              "border-destructive/40 bg-destructive/8 text-destructive",
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
        <div
          className={cn(
            "flex items-center gap-1.5 px-0.5 text-[11px] tabular-nums text-muted-foreground/80",
            outbound ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span>{formatMessageTime(message.createdAt)}</span>
          {failed ? (
            <span className="text-destructive">· Failed to send</span>
          ) : null}
          {outbound && !failed ? (
            <MessageDeliveryStatus status={message.status} />
          ) : null}
          <button
            type="button"
            className="inline-flex size-5 items-center justify-center rounded-md text-muted-foreground/70 opacity-0 transition-opacity hover:bg-muted/60 hover:text-foreground group-hover/message:opacity-100"
            aria-label="Message options"
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
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
    <div className={cn(isThread && "space-y-2")}>
      {isTemplate && templateDisplay ? (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/75">
            Template
          </p>
          <p className="font-medium leading-snug text-foreground text-sm">
            {templateDisplay.templateName}
          </p>
          {templateDisplay.body ? (
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground/90">
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
        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground">
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

function MessageBubble({ message }: { message: ConversationMessage }) {
  const outbound = message.direction === "OUTBOUND";
  const failed = message.status === "FAILED";
  const attachments = parseMessageAttachments(message.attachments);
  const displayText = messageDisplayText(message);
  const templateDisplay = parseTemplateDisplay(message);

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
          {failed ? <span>· Failed to send</span> : null}
          {outbound && !failed ? (
            <MessageDeliveryStatus status={message.status} />
          ) : null}
        </p>
      </div>
    </div>
  );
}
