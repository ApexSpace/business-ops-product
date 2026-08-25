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
import { ConversationChannelBadge } from "@/features/conversations/components/inbox/conversation-channel-display";
import { cn } from "@/lib/utils";

interface ConversationChannelBarProps {
  channels: ContactReplyChannel[];
  value: ConversationChannel | null;
  onChange?: (channel: ConversationChannel) => void;
  /** When true, always show a read-only badge (channel filter locked). */
  readOnly?: boolean;
  /** Icon/select only — for the composer tab row. */
  compact?: boolean;
  className?: string;
}

function ChannelSelectDropdown({
  channels,
  value,
  onChange,
  triggerClassName,
}: {
  channels: ContactReplyChannel[];
  value: ConversationChannel;
  onChange: (channel: ConversationChannel) => void;
  triggerClassName?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as ConversationChannel)}
    >
      <SelectTrigger
        className={cn(
          "h-8 w-auto max-w-[200px] shrink-0 border-border/60 bg-background px-2.5 text-xs shadow-none",
          triggerClassName,
        )}
        aria-label="Reply channel"
      >
        <span className="min-w-0 truncate text-left normal-case">
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

export function ConversationChannelBar({
  channels,
  value,
  onChange,
  readOnly = false,
  compact = false,
  className,
}: ConversationChannelBarProps) {
  const only = channels[0];
  const activeChannel = value ?? only?.channel;

  if (!activeChannel) {
    return null;
  }

  const canSwitch =
    !readOnly && channels.length > 1 && onChange && value != null;

  if (compact) {
    return (
      <div className={cn("shrink-0", className)}>
        {canSwitch ? (
          <ChannelSelectDropdown
            channels={channels}
            value={activeChannel}
            onChange={onChange}
            triggerClassName="h-[var(--control-height-sm)] border-violet-primary-normal text-violet-primary-normal"
          />
        ) : (
          <ConversationChannelBadge channel={activeChannel} />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-3 border-b border-border/50 bg-muted/20 px-3 py-2",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {canSwitch ? "Reply channel" : "Channel"}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {canSwitch
            ? "Choose where your reply will be sent."
            : `Replies are sent via ${channelLabel(activeChannel)}.`}
        </p>
      </div>
      <div className="shrink-0">
        {canSwitch ? (
          <ChannelSelectDropdown
            channels={channels}
            value={activeChannel}
            onChange={onChange}
          />
        ) : (
          <ConversationChannelBadge channel={activeChannel} />
        )}
      </div>
    </div>
  );
}
