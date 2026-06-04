"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/ui/relative-time";
import type { ConversationMessage } from "@/features/conversations/api/conversations.api";

type VirtualizedMessageListProps = {
  messages: ConversationMessage[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
};

export function VirtualizedMessageList({
  messages,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: VirtualizedMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 8,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="h-full max-h-[calc(100vh-16rem)] overflow-y-auto px-1"
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
              className="px-2 py-1.5"
            >
              <MessageBubble message={message} />
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

function MessageBubble({ message }: { message: ConversationMessage }) {
  const outbound = message.direction === "OUTBOUND";
  const failed = message.status === "FAILED";

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
        <p>{message.text ?? "[Attachment]"}</p>
        <p
          className={cn(
            "mt-1 text-[10px] opacity-70",
            outbound ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {formatRelativeTime(message.createdAt)}
          {failed ? " · Failed to send" : null}
        </p>
      </div>
    </div>
  );
}
