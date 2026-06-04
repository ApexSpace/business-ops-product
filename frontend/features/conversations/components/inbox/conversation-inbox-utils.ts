import type { Conversation, ConversationChannel } from "@/features/conversations/api/conversations.api";
import { channelLabel } from "@/features/conversations/api/conversations.api";

export function channelProviderKey(channel: ConversationChannel): string {
  if (channel === "FACEBOOK") return "facebook";
  if (channel === "INSTAGRAM") return "instagram";
  return "email";
}

export function contactDisplayName(conversation: Conversation): string {
  return (
    conversation.contact?.label ??
    conversation.title ??
    channelLabel(conversation.channel) + " contact"
  );
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const THREAD_ROW_HEIGHT = 72;
export const VIRTUALIZE_THRESHOLD = 30;
