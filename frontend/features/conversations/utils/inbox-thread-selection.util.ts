import type { UnifiedConversationThread } from "@/features/conversations/api/conversations.api";
import { findUnifiedThreadByConversationId } from "@/features/conversations/utils/unified-thread.utils";

export function resolveActiveInboxThread(input: {
  threads: UnifiedConversationThread[];
  threadsReady: boolean;
  manualThreadKey: string | null;
  threadFromQuery: string | null;
  conversationFromQuery: string | null;
}): UnifiedConversationThread | undefined {
  const {
    threads,
    threadsReady,
    manualThreadKey,
    threadFromQuery,
    conversationFromQuery,
  } = input;

  if (manualThreadKey) {
    const manual = threads.find((thread) => thread.threadKey === manualThreadKey);
    if (manual) return manual;
  }

  if (!threadsReady || threads.length === 0) {
    return undefined;
  }

  if (threadFromQuery) {
    const byThreadKey = threads.find(
      (thread) => thread.threadKey === threadFromQuery,
    );
    if (byThreadKey) return byThreadKey;
  }

  if (conversationFromQuery) {
    const byConversation = findUnifiedThreadByConversationId(
      threads,
      conversationFromQuery,
    );
    if (byConversation) return byConversation;

    const orphan = threads.find(
      (thread) => thread.threadKey === conversationFromQuery,
    );
    if (orphan) return orphan;
  }

  return threads[0];
}

export function buildInboxThreadSearchParams(
  thread: UnifiedConversationThread,
  current: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(current.toString());
  params.set("thread", thread.threadKey);
  if (thread.contactId) {
    params.set("conversation", thread.primaryConversationId);
  } else {
    params.delete("conversation");
  }
  return params;
}
