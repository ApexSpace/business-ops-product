"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  channelLabel,
  type ConversationChannel,
} from "@/features/conversations/api/conversations.api";
import { cn } from "@/lib/utils";

export type ThreadChannelFilterValue = ConversationChannel | "ALL";

export function threadChannelFilterLabel(
  value: ThreadChannelFilterValue,
  options?: { compact?: boolean },
): string {
  if (value === "ALL") {
    return options?.compact ? "All" : "All channels";
  }
  return channelLabel(value);
}

interface ThreadChannelFilterProps {
  channels: ConversationChannel[];
  value: ThreadChannelFilterValue;
  onChange: (value: ThreadChannelFilterValue) => void;
  className?: string;
}

export function ThreadChannelFilter({
  channels,
  value,
  onChange,
  className,
}: ThreadChannelFilterProps) {
  if (channels.length <= 1) {
    return null;
  }

  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as ThreadChannelFilterValue)}
    >
      <SelectTrigger
        className={cn(
          "h-8 w-[7.5rem] shrink-0 border-border/60 bg-muted/30 px-2 text-xs shadow-none",
          className,
        )}
        aria-label="Filter messages by channel"
      >
        <span className="min-w-0 flex-1 truncate text-left normal-case">
          {threadChannelFilterLabel(value, { compact: true })}
        </span>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="ALL">{threadChannelFilterLabel("ALL")}</SelectItem>
        {channels.map((channel) => (
          <SelectItem key={channel} value={channel}>
            {channelLabel(channel)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function filterMessagesByThreadChannel<
  T extends { channel: ConversationChannel },
>(messages: T[], filter: ThreadChannelFilterValue): T[] {
  if (filter === "ALL") {
    return messages;
  }
  return messages.filter((message) => message.channel === filter);
}
