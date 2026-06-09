"use client";

import { ImagePlus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  isPending: boolean;
  onSend: () => void;
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
  isPending,
  onSend,
}: MessageComposerProps) {
  return (
    <footer className="border-t border-border/80 p-3">
      {channelHint ? (
        <p className="mb-2 text-xs text-muted-foreground">{channelHint}</p>
      ) : null}
      {sendDisabledReason ? (
        <p className="mb-2 text-xs text-muted-foreground">{sendDisabledReason}</p>
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
            value={attachmentUrl}
            onChange={(e) => onAttachmentUrlChange(e.target.value)}
            placeholder="Paste public image URL to attach…"
            disabled={!canSend && Boolean(sendDisabledReason)}
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={
              !attachmentUrl.trim() || (!canSend && Boolean(sendDisabledReason))
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
          disabled={!canSend || isPending}
          onClick={onSend}
        >
          <Send className="size-4" />
        </Button>
      </div>
    </footer>
  );
}
