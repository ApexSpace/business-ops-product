import type {
  Conversation,
  UnifiedConversationThread,
} from "@/features/conversations/api/conversations.api";
import { channelLabel } from "@/features/conversations/api/conversations.api";

export function unifiedThreadDisplayName(
  thread: UnifiedConversationThread,
): string {
  if (thread.contact?.label?.trim()) {
    return thread.contact.label.trim();
  }

  const primary = thread.conversations.find(
    (conversation) => conversation.id === thread.primaryConversationId,
  );
  if (primary?.title?.trim()) {
    return primary.title.trim();
  }

  if (thread.channels.length === 1) {
    return `${channelLabel(thread.channels[0])} contact`;
  }

  return "Contact";
}

export function findUnifiedThreadByConversationId(
  threads: UnifiedConversationThread[],
  conversationId: string,
): UnifiedConversationThread | undefined {
  return threads.find(
    (thread) =>
      thread.primaryConversationId === conversationId ||
      thread.conversations.some(
        (conversation) => conversation.id === conversationId,
      ),
  );
}

export function primaryConversation(
  thread: UnifiedConversationThread,
): Conversation | undefined {
  return (
    thread.conversations.find(
      (conversation) => conversation.id === thread.primaryConversationId,
    ) ?? thread.conversations[0]
  );
}
