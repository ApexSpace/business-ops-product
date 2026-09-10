"use client";

import { useRef } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ComposerEmojiPicker } from "@/features/conversations/components/inbox/composer-emoji-picker";
import {
  SOCIAL_PLANNER_AVATAR_CLASS,
  SOCIAL_PLANNER_DRAWER_COMPOSER_CLASS,
  SOCIAL_PLANNER_INLINE_COMPOSER_CLASS,
  SOCIAL_PLANNER_SEND_ICON_BTN_CLASS,
} from "@/features/social-planner/styles/social-planner-tokens";
import { cn } from "@/lib/utils";

export type SocialReplyComposerProps = {
  variant?: "inline" | "drawer";
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  accountLabel?: string;
  disabled?: boolean;
  sending?: boolean;
  className?: string;
};

function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function insertEmoji(
  current: string,
  emoji: string,
  input: HTMLInputElement | HTMLTextAreaElement | null,
): string {
  if (!input) return `${current}${emoji}`;
  const start = input.selectionStart ?? current.length;
  const end = input.selectionEnd ?? current.length;
  return `${current.slice(0, start)}${emoji}${current.slice(end)}`;
}

/**
 * Slim social comment reply composer — conversation emoji picker variant.
 * Not the full inbox MessageComposer.
 */
export function SocialReplyComposer({
  variant = "inline",
  value,
  onChange,
  onSend,
  placeholder = "Write a reply…",
  accountLabel = "You",
  disabled = false,
  sending = false,
  className,
}: SocialReplyComposerProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const canSend = Boolean(value.trim()) && !disabled && !sending;

  const handleEmoji = (emoji: string) => {
    onChange(insertEmoji(value, emoji, inputRef.current));
  };

  if (variant === "drawer") {
    return (
      <div className={cn(SOCIAL_PLANNER_DRAWER_COMPOSER_CLASS, className)}>
        <Textarea
          ref={(node) => {
            inputRef.current = node;
          }}
          value={value}
          disabled={disabled || sending}
          placeholder={placeholder}
          rows={3}
          className="min-h-[72px] resize-none"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSend) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <ComposerEmojiPicker
            disabled={disabled || sending}
            onSelect={handleEmoji}
          />
          <Button
            type="button"
            variant="brand"
            size="sm"
            disabled={!canSend}
            onClick={onSend}
          >
            {sending ? "Sending…" : "Send Reply"}
            <SendHorizontal className="ml-1.5 size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(SOCIAL_PLANNER_INLINE_COMPOSER_CLASS, className)}>
      <span className={SOCIAL_PLANNER_AVATAR_CLASS} aria-hidden>
        {initialsFromLabel(accountLabel)}
      </span>
      <div className="relative min-w-0 flex-1">
        <Input
          ref={(node) => {
            inputRef.current = node;
          }}
          value={value}
          disabled={disabled || sending}
          placeholder={placeholder}
          className="pr-20"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (!canSend) return;
            onSend();
          }}
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          <ComposerEmojiPicker
            disabled={disabled || sending}
            onSelect={handleEmoji}
          />
        </div>
      </div>
      <button
        type="button"
        disabled={!canSend}
        aria-label={sending ? "Sending reply" : "Send reply"}
        className={SOCIAL_PLANNER_SEND_ICON_BTN_CLASS}
        onClick={onSend}
      >
        <SendHorizontal className="size-4" />
      </button>
    </div>
  );
}
