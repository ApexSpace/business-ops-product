"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MoreHorizontal } from "lucide-react";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  formatMessageDateSeparator,
  formatMessageTime,
  formatRelativeTime,
  isSameMessageDay,
} from "@/lib/ui/relative-time";
import type { ConversationMessage } from "@/features/conversations/api/conversations.api";
import { MessageDeliveryStatus } from "@/features/conversations/components/message-delivery-status";
import {
  channelProviderKey,
  initials,
} from "@/features/conversations/components/inbox/conversation-inbox-utils";
import { IntegrationProviderIcon } from "@/features/integrations/components/integration-provider-icon";
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
};

export function VirtualizedMessageList({
  messages,
  onLoadMore,
  hasMore,
  isLoadingMore,
  variant = "default",
  threadContext,
}: VirtualizedMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const previousCountRef = useRef(messages.length);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (variant === "thread" ? 120 : 72),
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
    const grew = messages.length > previousCountRef.current;
    previousCountRef.current = messages.length;

    if (!grew || !isNearBottomRef.current || messages.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
    });
  }, [messages.length, virtualizer]);

  return (
    <div
      ref={parentRef}
      className={cn(
        "h-full min-h-0 overflow-y-auto",
        variant === "thread" ? "px-4 py-3" : "px-1",
      )}
      onScroll={(e) => {
        const el = e.currentTarget;
        if (
          hasMore &&
          !isLoadingMore &&
          el.scrollTop < 80 &&
          onLoadMore
        ) {
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
              className={cn(variant === "thread" ? "px-0 py-2" : "px-2 py-1.5")}
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

function getEmptyMessageFallback(message: ConversationMessage): string {
  if (isInboundEmailMessage(message)) {
    return "(Email reply)";
  }
  return "[Attachment]";
}

function isInboundEmailMessage(message: ConversationMessage): boolean {
  return (
    message.direction === "INBOUND" &&
    (message.channel === "EMAIL" || message.providerKey === "email")
  );
}

function messageDisplayText(message: ConversationMessage): string | null {
  if (isInboundEmailMessage(message)) {
    return displayInboundEmailBody(message.text);
  }
  return message.text;
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <div className="h-px flex-1 bg-border/60" />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

function MessageAvatar({
  name,
  avatarUrl,
  channel,
  outbound,
}: {
  name: string;
  avatarUrl?: string | null;
  channel: ConversationMessage["channel"];
  outbound: boolean;
}) {
  return (
    <Avatar size="default" className="size-9 shrink-0">
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback
        className={cn(
          "text-xs font-medium",
          outbound ? "bg-primary/15 text-primary" : "bg-muted text-foreground",
        )}
      >
        {initials(name)}
      </AvatarFallback>
      <AvatarBadge className="bg-background text-foreground ring-background">
        <IntegrationProviderIcon
          providerKey={channelProviderKey(channel)}
          size="sm"
          className="!size-2.5"
        />
      </AvatarBadge>
    </Avatar>
  );
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
  const senderName = outbound
    ? threadContext.businessName?.trim() || "You"
    : threadContext.contactName;
  const avatarUrl = outbound ? null : threadContext.contactAvatarUrl;

  return (
    <div
      className={cn(
        "flex gap-2.5",
        outbound ? "flex-row-reverse" : "flex-row",
      )}
    >
      <MessageAvatar
        name={senderName}
        avatarUrl={avatarUrl}
        channel={message.channel}
        outbound={outbound}
      />
      <div
        className={cn(
          "min-w-0 max-w-[min(75%,520px)]",
          outbound ? "items-end text-right" : "items-start text-left",
        )}
      >
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          {senderName}
        </p>
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm shadow-sm",
            outbound
              ? "bg-primary/15 text-foreground"
              : "border border-border/50 bg-muted/50 text-foreground",
            failed &&
              "border border-destructive/50 bg-destructive/10 text-destructive",
          )}
        >
          <MessageBody
            message={message}
            attachments={attachments}
            displayText={displayText}
          />
        </div>
        <div
          className={cn(
            "mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground",
            outbound ? "justify-end" : "justify-start",
          )}
        >
          <span>{formatMessageTime(message.createdAt)}</span>
          {failed ? <span>· Failed to send</span> : null}
          {outbound && !failed ? (
            <MessageDeliveryStatus status={message.status} />
          ) : null}
          <button
            type="button"
            className="inline-flex size-5 items-center justify-center rounded hover:bg-muted/60"
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
}: {
  message: ConversationMessage;
  attachments: ReturnType<typeof parseMessageAttachments>;
  displayText: string | null;
  outbound?: boolean;
}) {
  return (
    <>
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
                  className="block overflow-hidden rounded-md"
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
                  className="block text-sm underline text-primary"
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
      {displayText ? <p className="whitespace-pre-wrap">{displayText}</p> : null}
      {!displayText && attachments.length === 0 ? (
        <p className="text-muted-foreground">
          {getEmptyMessageFallback(message)}
        </p>
      ) : null}
    </>
  );
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const outbound = message.direction === "OUTBOUND";
  const failed = message.status === "FAILED";
  const attachments = parseMessageAttachments(message.attachments);
  const displayText = messageDisplayText(message);

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
