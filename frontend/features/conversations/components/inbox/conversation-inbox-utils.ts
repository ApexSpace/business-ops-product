import type { Conversation, ConversationChannel } from "@/features/conversations/api/conversations.api";
import { channelLabel } from "@/features/conversations/api/conversations.api";

export function isWebchatConversation(
  conversation: Conversation | undefined | null,
): boolean {
  return (
    conversation?.channel === "WEBCHAT" ||
    conversation?.providerKey === "webchat"
  );
}

export function channelProviderKey(channel: ConversationChannel): string {
  if (channel === "FACEBOOK") return "facebook";
  if (channel === "INSTAGRAM") return "instagram";
  if (channel === "WHATSAPP") return "whatsapp";
  if (channel === "WEBCHAT") return "webchat";
  return "email";
}

/** Channel-specific composer guidance shown above the message input. */
export function channelComposerHint(
  channel: ConversationChannel,
  options?: { requiresTemplate?: boolean | null },
): string | null {
  if (channel === "EMAIL") {
    return "Replies are sent from your CodeSol business address. Customer replies return to this thread.";
  }
  if (channel === "WHATSAPP") {
    if (options?.requiresTemplate) {
      return "This contact hasn't messaged on WhatsApp in the last 24 hours. Send an approved template to reach them — free-form replies unlock for 24 hours after they reply.";
    }
    return "Free-form WhatsApp replies are available for 24 hours after the customer's last message.";
  }
  return null;
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
