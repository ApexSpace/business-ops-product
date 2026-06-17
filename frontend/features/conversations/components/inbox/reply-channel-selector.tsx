"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  channelLabel,
  type ContactReplyChannel,
  type ConversationChannel,
} from "@/features/conversations/api/conversations.api";
import { cn } from "@/lib/utils";

interface ReplyChannelSelectorProps {
  channels: ContactReplyChannel[];
  value: ConversationChannel | null;
  onChange: (channel: ConversationChannel) => void;
  disabled?: boolean;
  variant?: "default" | "compact";
}

function ChannelSelectDropdown({
  channels,
  value,
  onChange,
  disabled,
  triggerClassName,
}: {
  channels: ContactReplyChannel[];
  value: ConversationChannel;
  onChange: (channel: ConversationChannel) => void;
  disabled?: boolean;
  triggerClassName?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as ConversationChannel)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "h-9 shrink-0 text-xs normal-case",
          triggerClassName,
        )}
        aria-label="Reply channel"
      >
        <span className="min-w-0 flex-1 truncate text-left normal-case">
          {channelLabel(value)}
        </span>
      </SelectTrigger>
      <SelectContent align="start">
        {channels.map((channel) => (
          <SelectItem key={channel.channel} value={channel.channel}>
            <span className="flex items-center gap-2">
              {channelLabel(channel.channel)}
              {!channel.readyForMessaging ? (
                <span className="text-muted-foreground">(setup required)</span>
              ) : null}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ReplyChannelSelector({
  channels,
  value,
  onChange,
  disabled = false,
  variant = "default",
}: ReplyChannelSelectorProps) {
  const only = channels[0];
  const controlledValue = value ?? only?.channel;

  if (!only || !controlledValue) {
    return null;
  }

  if (channels.length <= 1) {
    if (variant === "compact") {
      return null;
    }

    return (
      <div className="mb-2 text-xs text-muted-foreground">
        Reply via {channelLabel(only.channel)}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <ChannelSelectDropdown
        channels={channels}
        value={controlledValue}
        onChange={onChange}
        disabled={disabled}
        triggerClassName="w-[7.5rem] border-border/60 bg-muted/30 px-2 shadow-none"
      />
    );
  }

  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">Reply via</span>
      <ChannelSelectDropdown
        channels={channels}
        value={controlledValue}
        onChange={onChange}
        disabled={disabled}
        triggerClassName="w-full max-w-[220px]"
      />
    </div>
  );
}
