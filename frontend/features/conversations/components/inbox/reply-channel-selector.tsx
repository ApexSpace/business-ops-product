"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  channelLabel,
  type ContactReplyChannel,
  type ConversationChannel,
} from "@/features/conversations/api/conversations.api";
import { IntegrationProviderIcon } from "@/features/integrations/components/integration-provider-icon";

interface ReplyChannelSelectorProps {
  channels: ContactReplyChannel[];
  value: ConversationChannel | null;
  onChange: (channel: ConversationChannel) => void;
  disabled?: boolean;
  variant?: "default" | "compact";
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

  const activeChannel =
    channels.find((channel) => channel.channel === controlledValue) ?? only;

  if (channels.length <= 1) {
    if (variant === "compact") {
      return (
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground"
          title={`Reply via ${channelLabel(only.channel)}`}
        >
          <IntegrationProviderIcon
            providerKey={only.providerKey}
            size="sm"
            className="!size-4"
          />
        </div>
      );
    }

    return (
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <IntegrationProviderIcon
          providerKey={only.providerKey}
          size="sm"
          className="!size-3.5"
        />
        Reply via {channelLabel(only.channel)}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Select
        value={controlledValue}
        onValueChange={(next) => onChange(next as ConversationChannel)}
        disabled={disabled}
      >
        <SelectTrigger
          className="size-9 shrink-0 border-0 bg-transparent p-0 shadow-none hover:bg-muted/60 [&>svg:last-child]:hidden"
          aria-label="Select reply channel"
        >
          <IntegrationProviderIcon
            providerKey={activeChannel.providerKey}
            size="sm"
            className="!size-4"
          />
        </SelectTrigger>
        <SelectContent align="start">
          {channels.map((channel) => (
            <SelectItem key={channel.channel} value={channel.channel}>
              <span className="flex items-center gap-2">
                <IntegrationProviderIcon
                  providerKey={channel.providerKey}
                  size="sm"
                  className="!size-3.5"
                />
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

  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">Reply via</span>
      <Select
        value={controlledValue}
        onValueChange={(next) => onChange(next as ConversationChannel)}
        disabled={disabled}
      >
        <SelectTrigger className="h-8 w-full max-w-[220px] text-xs">
          <SelectValue placeholder="Select channel" />
        </SelectTrigger>
        <SelectContent>
          {channels.map((channel) => (
            <SelectItem key={channel.channel} value={channel.channel}>
              <span className="flex items-center gap-2">
                <IntegrationProviderIcon
                  providerKey={channel.providerKey}
                  size="sm"
                  className="!size-3.5"
                />
                {channelLabel(channel.channel)}
                {!channel.readyForMessaging ? (
                  <span className="text-muted-foreground">(setup required)</span>
                ) : null}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
