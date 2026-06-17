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

/** Short channel guidance shown beside the reply-channel selector. */
export function channelComposerHint(
  channel: ConversationChannel,
  options?: { requiresTemplate?: boolean | null },
): string | null {
  if (channel === "EMAIL") {
    return "Sent from your business address.";
  }
  if (channel === "WHATSAPP") {
    if (options?.requiresTemplate) {
      return "24h window closed — use an approved template.";
    }
    return "24h reply window open.";
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

export { displayInitials as initials } from "@/lib/ui/display-initials";

export const THREAD_ROW_HEIGHT = 72;
export const VIRTUALIZE_THRESHOLD = 30;
