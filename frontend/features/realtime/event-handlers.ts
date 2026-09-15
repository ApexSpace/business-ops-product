import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { RealtimeEventPayload } from "@/features/realtime/sse-client";
import type {
  Conversation,
  ConversationMessage,
  MessageStatus,
  UnifiedConversationThread,
} from "@/features/conversations/api/conversations.api";
import { messagesMatchForOptimisticReconcile } from "@/features/conversations/utils/optimistic-message";
import { queryKeys } from "@/lib/query/keys";
import { invalidateCheckouts, invalidatePaymentLists } from "@/lib/query/invalidation";

export const REALTIME_EVENTS = {
  disabled: "realtime.disabled",
  messageReceived: "message.received",
  messageUpdated: "message.updated",
  messageDeleted: "message.deleted",
  conversationUpdated: "conversation.updated",
  jobCompleted: "job.completed",
  integrationStatusChanged: "integration.status_changed",
  paymentCollected: "payment.collected",
  checkoutClosed: "checkout.closed",
} as const;

type MessagePage = { items: ConversationMessage[] };

const DEFAULT_CONVERSATIONS_API_BASE = "conversations";

const MESSAGE_STATUS_RANK: Record<MessageStatus, number> = {
  RECEIVED: 0,
  PENDING: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
  FAILED: 5,
};

function shouldApplyMessageStatusUpdate(
  current: MessageStatus,
  next: MessageStatus,
): boolean {
  if (next === "FAILED") {
    return current !== "READ";
  }
  // Manual retry resets FAILED → PENDING (then SENT/DELIVERED/…)
  if (
    current === "FAILED" &&
    (next === "PENDING" ||
      next === "SENT" ||
      next === "DELIVERED" ||
      next === "READ")
  ) {
    return true;
  }
  return MESSAGE_STATUS_RANK[next] > MESSAGE_STATUS_RANK[current];
}

export function handleRealtimeEvent(
  queryClient: QueryClient,
  payload: RealtimeEventPayload,
  options?: { conversationsApiBase?: string },
): void {
  const event = payload.event;
  const apiBase =
    options?.conversationsApiBase ?? DEFAULT_CONVERSATIONS_API_BASE;

  switch (true) {
    case matchesEvent(event, REALTIME_EVENTS.disabled):
      break;
    case matchesEvent(event, REALTIME_EVENTS.messageReceived):
    case matchesEvent(event, "conversation.message.received"):
      handleMessageReceivedEvent(queryClient, payload.data, apiBase);
      break;
    case matchesEvent(event, REALTIME_EVENTS.messageUpdated):
    case matchesEvent(event, "conversation.message.updated"):
      handleMessageUpdatedEvent(queryClient, payload.data, apiBase);
      break;
    case matchesEvent(event, REALTIME_EVENTS.messageDeleted):
    case matchesEvent(event, "conversation.message.deleted"): {
      const data = payload.data as Record<string, unknown> | undefined;
      const conversationId =
        typeof data?.conversationId === "string" ? data.conversationId : null;
      const messageId =
        typeof data?.messageId === "string" ? data.messageId : null;
      if (conversationId && messageId) {
        removeMessageFromCache(
          queryClient,
          conversationId,
          messageId,
          undefined,
          apiBase,
        );
      }
      break;
    }
    case matchesEvent(event, REALTIME_EVENTS.conversationUpdated):
    case matchesEvent(event, "conversation.updated"):
      patchConversationEvent(queryClient, payload.data, apiBase);
      break;
    case matchesEvent(event, REALTIME_EVENTS.jobCompleted):
    case matchesEvent(event, REALTIME_EVENTS.integrationStatusChanged):
      void queryClient.invalidateQueries({
        queryKey: queryKeys.integrations.all(),
      });
      break;
    case matchesEvent(event, REALTIME_EVENTS.paymentCollected):
    case matchesEvent(event, "payment.collected"):
      void invalidatePaymentLists(queryClient);
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all() });
      break;
    case matchesEvent(event, REALTIME_EVENTS.checkoutClosed):
    case matchesEvent(event, "checkout.closed"): {
      const data = payload.data as Record<string, unknown> | undefined;
      const checkoutId =
        typeof data?.checkoutId === "string" ? data.checkoutId : undefined;
      void invalidateCheckouts(queryClient, checkoutId);
      break;
    }
    default:
      break;
  }
}

function matchesEvent(event: string, expected: string): boolean {
  return event === expected || event.endsWith(`.${expected}`);
}

function handleMessageReceivedEvent(
  queryClient: QueryClient,
  data: unknown,
  apiBase: string,
): void {
  if (!data || typeof data !== "object") return;
  const record = data as Record<string, unknown>;
  const conversationId =
    typeof record.conversationId === "string"
      ? record.conversationId
      : undefined;
  if (!conversationId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.conversations.all(apiBase),
    });
    return;
  }

  const contactId = resolveContactIdForConversation(
    queryClient,
    conversationId,
    apiBase,
  );
  const message = parseConversationMessage(record.message);
  if (message) {
    if (
      message.channel === "WEBCHAT" &&
      message.direction === "INBOUND" &&
      message.senderType === "CONTACT"
    ) {
      const preview = message.text?.trim().slice(0, 120) || "New website chat message";
      toast.info("New website chat", { description: preview });
      if (
        typeof window !== "undefined" &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification("New website chat", { body: preview });
      }
    }
    upsertMessageInCache(
      queryClient,
      conversationId,
      message,
      contactId,
      apiBase,
    );
    if (contactId) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.replyChannels(contactId, apiBase),
      });
    }
    void queryClient.invalidateQueries({
      queryKey: queryKeys.conversations.list(undefined, apiBase),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.conversations.unifiedList(undefined, apiBase),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.conversations.detail(conversationId, apiBase),
    });
    return;
  }

  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.messages(conversationId, 0, apiBase),
  });
  if (contactId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.conversations.contactMessages(contactId, 0, apiBase),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.conversations.replyChannels(contactId, apiBase),
    });
  }
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.detail(conversationId, apiBase),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.list(undefined, apiBase),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.unifiedList(undefined, apiBase),
  });
}

function handleMessageUpdatedEvent(
  queryClient: QueryClient,
  data: unknown,
  apiBase: string,
): void {
  if (!data || typeof data !== "object") return;
  const record = data as Record<string, unknown>;
  const conversationId =
    typeof record.conversationId === "string"
      ? record.conversationId
      : undefined;
  const messageId =
    typeof record.messageId === "string" ? record.messageId : undefined;
  const status =
    typeof record.status === "string"
      ? (record.status as MessageStatus)
      : undefined;
  const errorMessage =
    typeof record.errorMessage === "string"
      ? record.errorMessage
      : record.errorMessage === null
        ? null
        : undefined;

  const contactId = conversationId
    ? resolveContactIdForConversation(queryClient, conversationId, apiBase)
    : undefined;

  if (conversationId && messageId && status) {
    const patched = updateMessageInCache(
      queryClient,
      conversationId,
      messageId,
      {
        status,
        ...(errorMessage !== undefined ? { errorMessage } : {}),
      },
      contactId,
      apiBase,
    );
    if (patched) {
      return;
    }

    void queryClient.refetchQueries({
      queryKey: queryKeys.conversations.messages(conversationId, 0, apiBase),
      type: "active",
    });
    if (contactId) {
      void queryClient.refetchQueries({
        queryKey: queryKeys.conversations.contactMessages(
          contactId,
          0,
          apiBase,
        ),
        type: "active",
      });
    }
    return;
  }

  if (!conversationId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.conversations.all(apiBase),
    });
    return;
  }

  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.messages(conversationId, 0, apiBase),
  });
  if (contactId) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.conversations.contactMessages(contactId, 0, apiBase),
    });
  }
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.detail(conversationId, apiBase),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.list(undefined, apiBase),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.unifiedList(undefined, apiBase),
  });
}

function patchConversationEvent(
  queryClient: QueryClient,
  data: unknown,
  apiBase: string,
): void {
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
      queryKeys.conversations.detail(id, apiBase),
      (prev) =>
        prev
          ? ({ ...prev, ...(record as Partial<Conversation>) } as Conversation)
          : prev,
    );
  }

  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.list(undefined, apiBase),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.conversations.unifiedList(undefined, apiBase),
  });
}

function parseConversationMessage(value: unknown): ConversationMessage | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.conversationId !== "string" ||
    typeof record.status !== "string"
  ) {
    return null;
  }
  return record as unknown as ConversationMessage;
}

export function appendMessageToCache(
  queryClient: QueryClient,
  conversationId: string,
  message: ConversationMessage,
  contactId?: string | null,
  apiBase: string = DEFAULT_CONVERSATIONS_API_BASE,
): void {
  const resolvedContactId =
    contactId ??
    resolveContactIdForConversation(queryClient, conversationId, apiBase);
  upsertMessageInCache(
    queryClient,
    conversationId,
    message,
    resolvedContactId,
    apiBase,
  );
}

export function appendMessageToContactCache(
  queryClient: QueryClient,
  contactId: string,
  message: ConversationMessage,
  apiBase: string = DEFAULT_CONVERSATIONS_API_BASE,
): void {
  upsertMessageInContactCache(queryClient, contactId, message, apiBase);
}

function findOptimisticReconcileIndex(
  items: ConversationMessage[],
  message: ConversationMessage,
): number {
  return items.findIndex((item) =>
    messagesMatchForOptimisticReconcile(item, message),
  );
}

export function removeMessageFromCache(
  queryClient: QueryClient,
  conversationId: string,
  messageId: string,
  contactId?: string | null,
  apiBase: string = DEFAULT_CONVERSATIONS_API_BASE,
): void {
  const resolvedContactId =
    contactId ??
    resolveContactIdForConversation(queryClient, conversationId, apiBase);

  queryClient.setQueryData<InfiniteData<MessagePage>>(
    queryKeys.conversations.messages(conversationId, 0, apiBase),
    (old) => {
      if (!old?.pages?.length) return old;

      const pages = old.pages.map((page) => ({
        ...page,
        items: page.items.filter((item) => item.id !== messageId),
      }));

      return { ...old, pages,
};
    },
  );

  if (resolvedContactId) {
    queryClient.setQueryData<InfiniteData<MessagePage>>(
      queryKeys.conversations.contactMessages(resolvedContactId, 0, apiBase),
      (old) => {
        if (!old?.pages?.length) return old;

        const pages = old.pages.map((page) => ({
          ...page,
          items: page.items.filter((item) => item.id !== messageId),
        }));

        return { ...old, pages,
};
      },
    );
  }
}

export function patchConversationPreviewInCache(
  queryClient: QueryClient,
  conversationId: string,
  preview: string,
  apiBase: string = DEFAULT_CONVERSATIONS_API_BASE,
): void {
  const now = new Date().toISOString();

  queryClient.setQueriesData<{ items: Conversation[] }>(
    { queryKey: queryKeys.conversations.list(undefined, apiBase) },
    (old) => {
      if (!old?.items) return old;

      return {
        ...old,
        items: old.items.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                lastMessagePreview: preview,
                lastMessageAt: now,
              }
            : conversation,
        ),
      };
    },
  );

  queryClient.setQueriesData<{ items: UnifiedConversationThread[] }>(
    { queryKey: queryKeys.conversations.unifiedList(undefined, apiBase) },
    (old) => {
      if (!old?.items) return old;

      return {
        ...old,
        items: old.items.map((thread) => {
          const matchesConversation = thread.conversations.some(
            (conversation) => conversation.id === conversationId,
          );
          if (!matchesConversation) return thread;

          return {
            ...thread,
            lastMessagePreview: preview,
            lastMessageAt: now,
            conversations: thread.conversations.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    lastMessagePreview: preview,
                    lastMessageAt: now,
                  }
                : conversation,
            ),
          };
        }),
      };
    },
  );
}

function upsertMessageInInfiniteCache(
  queryClient: QueryClient,
  queryKey: readonly (string | number)[],
  message: ConversationMessage,
): void {
  queryClient.setQueryData<InfiniteData<MessagePage>>(queryKey, (old) => {
    if (!old?.pages?.length) {
      return {
        pages: [{ items: [message] }],
        pageParams: [""],
      };
    }

    const pages = old.pages.map((page) => ({
      ...page,
      items: [...page.items],
    }));

    for (const page of pages) {
      const index = page.items.findIndex((item) => item.id === message.id);
      if (index >= 0) {
        page.items[index] = { ...page.items[index], ...message,
};
        return { ...old, pages,
};
      }
    }

    for (const page of pages) {
      const optimisticIndex = findOptimisticReconcileIndex(page.items, message);
      if (optimisticIndex >= 0) {
        page.items[optimisticIndex] = message;
        return { ...old, pages,
};
      }
    }

    const latestPage = pages[0];
    pages[0] = {
      ...latestPage,
      items: [...latestPage.items, message],
    };
    return { ...old, pages,
};
  });
}

export function refetchContactMessagesCache(
  queryClient: QueryClient,
  contactId: string,
  apiBase: string = DEFAULT_CONVERSATIONS_API_BASE,
): Promise<void> {
  return queryClient.refetchQueries({
    queryKey: queryKeys.conversations.contactMessages(contactId, 0, apiBase),
    type: "active",
  });
}

function upsertMessageInContactCache(
  queryClient: QueryClient,
  contactId: string,
  message: ConversationMessage,
  apiBase: string = DEFAULT_CONVERSATIONS_API_BASE,
): void {
  upsertMessageInInfiniteCache(
    queryClient,
    queryKeys.conversations.contactMessages(contactId, 0, apiBase),
    message,
  );
}

export function upsertMessageInCache(
  queryClient: QueryClient,
  conversationId: string,
  message: ConversationMessage,
  contactId?: string | null,
  apiBase: string = DEFAULT_CONVERSATIONS_API_BASE,
): void {
  const resolvedContactId =
    contactId ??
    resolveContactIdForConversation(queryClient, conversationId, apiBase);

  upsertMessageInInfiniteCache(
    queryClient,
    queryKeys.conversations.messages(conversationId, 0, apiBase),
    message,
  );

  if (resolvedContactId) {
    upsertMessageInContactCache(
      queryClient,
      resolvedContactId,
      message,
      apiBase,
    );
  }
}

function resolveContactIdForConversation(
  queryClient: QueryClient,
  conversationId: string,
  apiBase: string = DEFAULT_CONVERSATIONS_API_BASE,
): string | null {
  const detail = queryClient.getQueryData<Conversation>(
    queryKeys.conversations.detail(conversationId, apiBase),
  );
  if (detail?.contactId) {
    return detail.contactId;
  }

  const unifiedLists = queryClient.getQueriesData<{
    items: UnifiedConversationThread[];
  }>({ queryKey: queryKeys.conversations.unifiedList(undefined, apiBase) });

  for (const [, data] of unifiedLists) {
    const thread = data?.items?.find((item) =>
      item.conversations.some(
        (conversation) => conversation.id === conversationId,
      ),
    );
    if (thread?.contactId) {
      return thread.contactId;
    }
  }

  return null;
}

function patchMessageInInfiniteCache(
  queryClient: QueryClient,
  queryKey: readonly (string | number)[],
  messageId: string,
  patch: Partial<Pick<ConversationMessage, "status" | "errorMessage" | "sentAt">>,
): boolean {
  let patched = false;

  queryClient.setQueryData<InfiniteData<MessagePage>>(queryKey, (old) => {
    if (!old?.pages?.length) return old;

    const pages = old.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => {
        if (item.id !== messageId) return item;
        if (
          patch.status &&
          !shouldApplyMessageStatusUpdate(item.status, patch.status)
        ) {
          return item;
        }
        patched = true;
        return { ...item, ...patch,
};
      }),
    }));

    return patched ? { ...old, pages } : old;
  });

  return patched;
}

export function updateMessageInCache(
  queryClient: QueryClient,
  conversationId: string,
  messageId: string,
  patch: Partial<Pick<ConversationMessage, "status" | "errorMessage" | "sentAt">>,
  contactId?: string | null,
  apiBase: string = DEFAULT_CONVERSATIONS_API_BASE,
): boolean {
  const resolvedContactId =
    contactId ??
    resolveContactIdForConversation(queryClient, conversationId, apiBase);

  const patched = patchMessageInInfiniteCache(
    queryClient,
    queryKeys.conversations.messages(conversationId, 0, apiBase),
    messageId,
    patch,
  );

  if (resolvedContactId) {
    patchMessageInInfiniteCache(
      queryClient,
      queryKeys.conversations.contactMessages(resolvedContactId, 0, apiBase),
      messageId,
      patch,
    );
  }

  return patched;
}
