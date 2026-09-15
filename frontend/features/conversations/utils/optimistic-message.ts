import type {
  Conversation,
  ConversationMessage,
} from "@/features/conversations/api/conversations.api";

export const OPTIMISTIC_MESSAGE_ID_PREFIX = "optimistic:";

export function isOptimisticMessageId(id: string): boolean {
  return id.startsWith(OPTIMISTIC_MESSAGE_ID_PREFIX);
}

export function createOptimisticOutboundMessage(input: {
  conversation: Pick<Conversation, "id" | "channel" | "providerKey">;
  text: string;
  attachments?: Array<{ type: string; url: string }> | null;
}): ConversationMessage {
  const now = new Date().toISOString();
  const id = `${OPTIMISTIC_MESSAGE_ID_PREFIX}${crypto.randomUUID()}`;

  return {
    id,
    conversationId: input.conversation.id,
    channel: input.conversation.channel,
    providerKey: input.conversation.providerKey,
    direction: "OUTBOUND",
    senderType: "USER",
    senderUserId: null,
    text: input.text || null,
    attachments: input.attachments?.length ? input.attachments : null,
    status: "PENDING",
    errorMessage: null,
    sentAt: null,
    receivedAt: null,
    createdAt: now,
  };
}

export function messagesMatchForOptimisticReconcile(
  optimistic: ConversationMessage,
  confirmed: ConversationMessage,
): boolean {
  if (!isOptimisticMessageId(optimistic.id)) return false;
  if (optimistic.direction !== "OUTBOUND" || confirmed.direction !== "OUTBOUND") {
    return false;
  }
  if (optimistic.status !== "PENDING") return false;

  const optimisticText = (optimistic.text ?? "").trim();
  const confirmedText = (confirmed.text ?? "").trim();
  if (optimisticText && confirmedText) {
    return optimisticText === confirmedText;
  }

  return JSON.stringify(optimistic.attachments) === JSON.stringify(confirmed.attachments);
}
