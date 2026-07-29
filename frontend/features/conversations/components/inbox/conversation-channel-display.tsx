"use client";

import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Camera,
  Globe,
  Mail,
  MessageCircle,
  MessagesSquare,
  Smartphone,
} from "lucide-react";
import {
  channelLabel,
  type ConversationChannel,
} from "@/features/conversations/api/conversations.api";
import { cn } from "@/lib/utils";

const CHANNEL_ICON: Record<ConversationChannel, LucideIcon> = {
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
  SMS: Smartphone,
  FACEBOOK: MessagesSquare,
  INSTAGRAM: Camera,
  WEBCHAT: Globe,
  LINKEDIN: Briefcase,
};

const CHANNEL_TONE: Record<ConversationChannel, string> = {
  EMAIL: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  WHATSAPP: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  SMS: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  FACEBOOK: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  INSTAGRAM: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
  WEBCHAT: "bg-primary-tint text-primary",
  LINKEDIN: "bg-sky-600/10 text-sky-800 dark:text-sky-200",
};

export function getConversationChannelIcon(
  channel: ConversationChannel,
): LucideIcon {
  return CHANNEL_ICON[channel] ?? MessageCircle;
}

interface ConversationChannelBadgeProps {
  channel: ConversationChannel;
  className?: string;
  size?: "sm" | "md";
}

export function ConversationChannelBadge({
  channel,
  className,
  size = "md",
}: ConversationChannelBadgeProps) {
  const Icon = getConversationChannelIcon(channel);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full font-medium",
        CHANNEL_TONE[channel],
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-3 shrink-0" : "size-3.5 shrink-0"} />
      <span className="truncate">{channelLabel(channel)}</span>
    </span>
  );
}
