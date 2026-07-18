import type { ConversationMessage } from "@/features/conversations/api/conversations.api";

/** Staff or contact messages — not bot / automated system messages. */
export function isDeletableConversationMessage(
  message: ConversationMessage,
): boolean {
  return message.senderType === "CONTACT" || message.senderType === "USER";
}
