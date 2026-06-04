import type { QueryClient } from "@tanstack/react-query";
import type { RealtimeEventPayload } from "@/features/realtime/sse-client";
import type {
  Conversation,
  ConversationMessage,
} from "@/features/conversations/api/conversations.api";
import { queryKeys } from "@/lib/query/keys";

export const REALTIME_EVENTS = {
  disabled: "realtime.disabled",
  messageReceived: "message.received",
  messageUpdated: "message.updated",
  conversationUpdated: "conversation.updated",
  jobCompleted: "job.completed",
  integrationStatusChanged: "integration.status_changed",
} as const;

export function handleRealtimeEvent(
  queryClient: QueryClient,
  payload: RealtimeEventPayload,
): void {
  const event = payload.event;

  switch (true) {
    case matchesEvent(event, REALTIME_EVENTS.disabled):
      break;
    case matchesEvent(event, REALTIME_EVENTS.messageReceived):
    case matchesEvent(event, REALTIME_EVENTS.messageUpdated):
    case matchesEvent(event, "conversation.message.received"):
      patchMessageEvent(queryClient, payload.data);
      break;
    case matchesEvent(event, REALTIME_EVENTS.conversationUpdated):
    case matchesEvent(event, "conversation.updated"):
      patchConversationEvent(queryClient, payload.data);
      break;
    case matchesEvent(event, REALTIME_EVENTS.jobCompleted):
    case matchesEvent(event, REALTIME_EVENTS.integrationStatusChanged):
      void queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.all(),
      });
      break;
    default:
      break;
  }
}

function matchesEvent(event: string, expected: string): boolean {
  return event === expected || event.endsWith(`.${expected}`);
}

function patchMessageEvent(queryClient: QueryClient, data: unknown): void {
  if (!data || typeof data !== "object") return;
  const record = data as Record<string, unknown>;
  const conversationId =
    typeof record.conversationId === "string"
      ? record.conversationId
      : undefined;
  if (!conversationId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.conversations.all(),
    });
    return;
  }

  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.messages(conversationId, 0),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.detail(conversationId),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.list(),
  });
}

function patchConversationEvent(queryClient: QueryClient, data: unknown): void {
  if (!data || typeof data !== "object") return;
  const record = data as Record<string, unknown>;
  const id =
    typeof record.id === "string"
      ? record.id
      : typeof record.conversationId === "string"
        ? record.conversationId
        : undefined;

  if (id) {
    queryClient.setQueryData<Conversation>(
      queryKeys.conversations.detail(id),
      (prev) =>
        prev
          ? ({ ...prev, ...(record as Partial<Conversation>) } as Conversation)
          : prev,
    );
  }

  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.list(),
  });
}

export function appendMessageToCache(
  queryClient: QueryClient,
  conversationId: string,
  message: ConversationMessage,
): void {
  queryClient.setQueryData(
    queryKeys.conversations.messages(conversationId, 0),
    (old: { pages: { items: ConversationMessage[] }[] } | undefined) => {
      if (!old?.pages?.length) return old;
      const pages = [...old.pages];
      const last = pages[pages.length - 1];
      pages[pages.length - 1] = {
        ...last,
        items: [...last.items, message],
      };
      return { ...old, pages };
    },
  );
}
