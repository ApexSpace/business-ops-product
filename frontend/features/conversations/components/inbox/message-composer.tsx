"use client";

import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessageComposerProps {
  composer: string;
  onComposerChange: (value: string) => void;
  canSend: boolean;
  sendDisabledReason: string | null;
  isPending: boolean;
  onSend: () => void;
}

export function MessageComposer({
  composer,
  onComposerChange,
  canSend,
  sendDisabledReason,
  isPending,
  onSend,
}: MessageComposerProps) {
  return (
    <footer className="border-t border-border/80 p-3">
      {sendDisabledReason ? (
        <p className="mb-2 text-xs text-muted-foreground">{sendDisabledReason}</p>
      ) : null}
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
