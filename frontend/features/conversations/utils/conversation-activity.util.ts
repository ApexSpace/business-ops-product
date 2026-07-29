import type { ConversationMessage } from "@/features/conversations/api/conversations.api";

/** SYSTEM messages that represent staff status actions (not chatbot replies). */
export function isConversationActivityMessage(
  message: ConversationMessage,
): boolean {
  return (
    message.senderType === "SYSTEM" &&
    typeof message.activityType === "string" &&
    message.activityType.trim().length > 0
  );
}
