"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { NavArrowIcon } from "@/components/ui/nav-arrow-icon";
import {
  channelLabel,
  type ContactReplyChannel,
  type ConversationChannel,
} from "@/features/conversations/api/conversations.api";
import { cn } from "@/lib/utils";

interface ConversationChannelBarProps {
  channels: ContactReplyChannel[];
  value: ConversationChannel | null;
  onChange?: (channel: ConversationChannel) => void;
  className?: string;
}

const COMPOSER_CHANNEL_TRIGGER_CLASS =
  "text-violet-primary-normal [&_svg]:text-violet-primary-normal";

function ChannelSelectDropdown({
  channels,
  value,
  onChange,
}: {
  channels: ContactReplyChannel[];
  value: ConversationChannel;
  onChange: (channel: ConversationChannel) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as ConversationChannel)}
    >
      <SelectTrigger
        size="compact"
        className={COMPOSER_CHANNEL_TRIGGER_CLASS}
        aria-label="Reply channel"
      >
        <span className="min-w-0 truncate text-left normal-case">
          {channelLabel(value)}
        </span>
      </SelectTrigger>
      <SelectContent align="end">
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

export function ConversationChannelBar({
  channels,
  value,
  onChange,
  className,
}: ConversationChannelBarProps) {
  const only = channels[0];
  const activeChannel = value ?? only?.channel;

  if (!activeChannel) {
    return null;
  }

  const canSwitch = channels.length > 1 && onChange && value != null;

  return (
    <div className={cn("shrink-0", className)}>
      {canSwitch ? (
        <ChannelSelectDropdown
          channels={channels}
          value={activeChannel}
          onChange={onChange}
        />
      ) : (
        <span
          className={cn(
            "inline-flex h-auto min-h-0 w-auto items-center gap-1 rounded-[var(--radius-xs)] border border-border bg-white px-2 py-1 text-xs font-medium",
            COMPOSER_CHANNEL_TRIGGER_CLASS,
          )}
        >
          {channelLabel(activeChannel)}
          <NavArrowIcon direction="down" size="sm" aria-hidden />
        </span>
      )}
    </div>
  );
}
