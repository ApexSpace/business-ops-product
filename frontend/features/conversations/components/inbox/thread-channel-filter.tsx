"use client";

import { ListFilter } from "lucide-react";
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
import { FILTER_ALL_LABELS } from "@/lib/ui/filter-labels";
import { cn } from "@/lib/utils";

export type ThreadChannelFilterValue = ConversationChannel | "ALL";

export function threadChannelFilterLabel(
  value: ThreadChannelFilterValue,
): string {
  if (value === "ALL") {
    return FILTER_ALL_LABELS.channels;
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
        size="compact"
        className={cn("leading-none text-foreground", className)}
        aria-label="Filter notes by channel"
      >
        <span className="flex min-w-0 items-center gap-1 text-left normal-case">
          <ListFilter className="size-3 shrink-0" aria-hidden />
          {threadChannelFilterLabel(value)}
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
