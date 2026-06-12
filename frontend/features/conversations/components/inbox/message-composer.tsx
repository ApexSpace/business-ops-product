"use client";

import { ImagePlus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ReplyChannelSelector } from "@/features/conversations/components/inbox/reply-channel-selector";
import type {
  ContactReplyChannel,
  ConversationChannel,
} from "@/features/conversations/api/conversations.api";

export interface PendingMessageAttachment {
  type: string;
  url: string;
}

interface MessageComposerProps {
  composer: string;
  onComposerChange: (value: string) => void;
  attachmentUrl: string;
  onAttachmentUrlChange: (value: string) => void;
  pendingAttachment: PendingMessageAttachment | null;
  onAddAttachment: () => void;
  onRemoveAttachment: () => void;
  canSend: boolean;
  sendDisabledReason: string | null;
  channelHint?: string | null;
  subject?: string;
  onSubjectChange?: (value: string) => void;
  showSubject?: boolean;
  replyChannels?: ContactReplyChannel[];
  selectedReplyChannel?: ConversationChannel | null;
  onReplyChannelChange?: (channel: ConversationChannel) => void;
  onSend: () => void;
  variant?: "default" | "thread";
}

export function MessageComposer({
  composer,
  onComposerChange,
  attachmentUrl,
  onAttachmentUrlChange,
  pendingAttachment,
  onAddAttachment,
  onRemoveAttachment,
  canSend,
  sendDisabledReason,
  channelHint,
  subject,
  onSubjectChange,
  showSubject = false,
  replyChannels,
  selectedReplyChannel,
  onReplyChannelChange,
  onSend,
  variant = "default",
}: MessageComposerProps) {
  if (variant === "thread") {
    return (
      <footer className="shrink-0 border-t border-border/60 bg-background px-4 py-3">
        {showSubject ? (
          <div className="mb-2">
            <Input
              value={subject ?? ""}
              onChange={(e) => onSubjectChange?.(e.target.value)}
              placeholder="Email subject"
              className="h-9 border-border/70 bg-background text-sm shadow-none"
              disabled={!canSend && Boolean(sendDisabledReason)}
            />
          </div>
        ) : null}
        {channelHint ? (
          <p className="mb-2 text-xs text-muted-foreground">{channelHint}</p>
        ) : null}
        {sendDisabledReason ? (
          <p className="mb-2 text-xs text-muted-foreground">{sendDisabledReason}</p>
        ) : null}
        <div className="flex items-end gap-2 rounded-lg border border-border/70 bg-background px-2 py-1.5 shadow-sm">
          {replyChannels && replyChannels.length > 0 && onReplyChannelChange ? (
            <ReplyChannelSelector
              channels={replyChannels}
              value={selectedReplyChannel ?? null}
              onChange={onReplyChannelChange}
              variant="compact"
            />
          ) : null}
          <Textarea
            value={composer}
            onChange={(e) => onComposerChange(e.target.value)}
            placeholder="Type a message…"
            rows={1}
            className="min-h-9 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-sm shadow-none focus-visible:ring-0"
            disabled={!canSend && Boolean(sendDisabledReason)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) onSend();
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            className="size-9 shrink-0 rounded-full"
            disabled={!canSend}
            onClick={onSend}
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </footer>
    );
  }

  return (
    <footer className="shrink-0 border-t border-border/80 bg-card p-3">
      {replyChannels && replyChannels.length > 0 && onReplyChannelChange ? (
        <ReplyChannelSelector
          channels={replyChannels}
          value={selectedReplyChannel ?? null}
          onChange={onReplyChannelChange}
        />
      ) : null}
      {channelHint ? (
        <p className="mb-2 text-xs text-muted-foreground">{channelHint}</p>
      ) : null}
      {sendDisabledReason ? (
        <p className="mb-2 text-xs text-muted-foreground">{sendDisabledReason}</p>
      ) : null}
      {showSubject ? (
        <div className="mb-2">
          <Input
            value={subject ?? ""}
            onChange={(e) => onSubjectChange?.(e.target.value)}
            placeholder="Email subject"
            disabled={!canSend && Boolean(sendDisabledReason)}
          />
        </div>
      ) : null}
      {pendingAttachment ? (
        <div className="mb-2 flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs">
          <span className="truncate">
            Image attached: {pendingAttachment.url}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 shrink-0"
            onClick={onRemoveAttachment}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="mb-2 flex gap-2">
          <Input
            value={attachmentUrl ?? ""}
            onChange={(e) => onAttachmentUrlChange(e.target.value)}
            placeholder="Paste public image URL to attach…"
            disabled={!canSend && Boolean(sendDisabledReason)}
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={
              !(attachmentUrl ?? "").trim() ||
              (!canSend && Boolean(sendDisabledReason))
            }
            onClick={onAddAttachment}
          >
            <ImagePlus className="size-4" />
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        <Textarea
          value={composer}
          onChange={(e) => onComposerChange(e.target.value)}
          placeholder="Type a message…"
          rows={2}
          className="min-h-[60px] resize-none"
          disabled={!canSend && Boolean(sendDisabledReason)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
        />
        <Button
          className="shrink-0 self-end"
          disabled={!canSend}
          onClick={onSend}
        >
          <Send className="size-4" />
        </Button>
      </div>
    </footer>
  );
}
