import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { ConversationMessage } from "@/features/conversations/api/conversations.api";
import { OPTIMISTIC_MESSAGE_ID_PREFIX } from "@/features/conversations/utils/optimistic-message";
import {
  appendMessageToCache,
  handleRealtimeEvent,
  removeMessageFromCache,
  updateMessageInCache,
  upsertMessageInCache,
} from "./event-handlers";
import { queryKeys } from "@/lib/query/keys";

const conversationId = "conv-1";

const baseMessage: ConversationMessage = {
  id: "msg-1",
  conversationId,
  channel: "WHATSAPP",
  providerKey: "whatsapp",
  direction: "INBOUND",
  senderType: "CONTACT",
  senderUserId: null,
  text: "Hello",
  attachments: null,
  status: "RECEIVED",
  errorMessage: null,
  sentAt: null,
  receivedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
};

function seedMessages(
  queryClient: QueryClient,
  items: ConversationMessage[],
): void {
  queryClient.setQueryData(queryKeys.conversations.messages(conversationId, 0), {
    pages: [{ items }],
    pageParams: [""],
  });
}

describe("event-handlers", () => {
  it("appends inbound messages without invalidating the messages query", () => {
    const queryClient = new QueryClient();
    seedMessages(queryClient, []);

    handleRealtimeEvent(queryClient, {
      event: "conversation.message.received",
      data: { conversationId, message: baseMessage },
      at: new Date().toISOString(),
    });

    const cached = queryClient.getQueryData<{
      pages: { items: ConversationMessage[] }[];
    }>(queryKeys.conversations.messages(conversationId, 0));

    expect(cached?.pages[0]?.items).toHaveLength(1);
    expect(cached?.pages[0]?.items[0]?.text).toBe("Hello");
  });

  it("patches outbound delivery status in cache", () => {
    const queryClient = new QueryClient();
    seedMessages(queryClient, [{ ...baseMessage, direction: "OUTBOUND", status: "SENT" }]);

    handleRealtimeEvent(queryClient, {
      event: "conversation.message.updated",
      data: {
        conversationId,
        messageId: "msg-1",
        status: "DELIVERED",
      },
      at: new Date().toISOString(),
    });

    const cached = queryClient.getQueryData<{
      pages: { items: ConversationMessage[] }[];
    }>(queryKeys.conversations.messages(conversationId, 0));

    expect(cached?.pages[0]?.items[0]?.status).toBe("DELIVERED");
  });

  it("upserts by message id instead of duplicating", () => {
    const queryClient = new QueryClient();
    seedMessages(queryClient, [baseMessage]);

    upsertMessageInCache(queryClient, conversationId, {
      ...baseMessage,
      text: "Updated",
    });

    const cached = queryClient.getQueryData<{
      pages: { items: ConversationMessage[] }[];
    }>(queryKeys.conversations.messages(conversationId, 0));

    expect(cached?.pages[0]?.items).toHaveLength(1);
    expect(cached?.pages[0]?.items[0]?.text).toBe("Updated");
  });

  it("appendMessageToCache adds to the last page", () => {
    const queryClient = new QueryClient();
    seedMessages(queryClient, [baseMessage]);

    appendMessageToCache(queryClient, conversationId, {
      ...baseMessage,
      id: "msg-2",
      text: "Second",
    });

    const cached = queryClient.getQueryData<{
      pages: { items: ConversationMessage[] }[];
    }>(queryKeys.conversations.messages(conversationId, 0));

    expect(cached?.pages[0]?.items).toHaveLength(2);
  });

  it("does not downgrade delivery status on out-of-order events", () => {
    const queryClient = new QueryClient();
    seedMessages(queryClient, [
      { ...baseMessage, direction: "OUTBOUND", status: "READ" },
    ]);

    handleRealtimeEvent(queryClient, {
      event: "conversation.message.updated",
      data: {
        conversationId,
        messageId: "msg-1",
        status: "SENT",
      },
      at: new Date().toISOString(),
    });

    const cached = queryClient.getQueryData<{
      pages: { items: ConversationMessage[] }[];
    }>(queryKeys.conversations.messages(conversationId, 0));

    expect(cached?.pages[0]?.items[0]?.status).toBe("READ");
  });

  it("replaces a matching optimistic outbound message with the confirmed message", () => {
    const queryClient = new QueryClient();
    const optimisticId = `${OPTIMISTIC_MESSAGE_ID_PREFIX}temp-1`;

    seedMessages(queryClient, [
      {
        ...baseMessage,
        id: optimisticId,
        direction: "OUTBOUND",
        text: "hello world",
        status: "PENDING",
      },
    ]);

    upsertMessageInCache(queryClient, conversationId, {
      ...baseMessage,
      id: "msg-real",
      direction: "OUTBOUND",
      text: "hello world",
      status: "SENT",
    });

    const cached = queryClient.getQueryData<{
      pages: { items: ConversationMessage[] }[];
    }>(queryKeys.conversations.messages(conversationId, 0));

    expect(cached?.pages[0]?.items).toHaveLength(1);
    expect(cached?.pages[0]?.items[0]?.id).toBe("msg-real");
    expect(cached?.pages[0]?.items[0]?.status).toBe("SENT");
  });

  it("removeMessageFromCache drops only the targeted message", () => {
    const queryClient = new QueryClient();
    seedMessages(queryClient, [
      baseMessage,
      { ...baseMessage, id: "msg-2", text: "Second" },
    ]);

    removeMessageFromCache(queryClient, conversationId, "msg-2");

    const cached = queryClient.getQueryData<{
      pages: { items: ConversationMessage[] }[];
    }>(queryKeys.conversations.messages(conversationId, 0));

    expect(cached?.pages[0]?.items).toHaveLength(1);
    expect(cached?.pages[0]?.items[0]?.id).toBe("msg-1");
  });

  it("updateMessageInCache returns false when message is missing", () => {
    const queryClient = new QueryClient();
    seedMessages(queryClient, []);

    const patched = updateMessageInCache(queryClient, conversationId, "missing", {
      status: "READ",
    });

    expect(patched).toBe(false);
  });

  it("upserts inbound messages into the contact timeline cache", () => {
    const queryClient = new QueryClient();
    const contactId = "contact-1";

    queryClient.setQueryData(queryKeys.conversations.contactMessages(contactId, 0), {
      pages: [{ items: [] }],
      pageParams: [""],
    });

    upsertMessageInCache(queryClient, conversationId, baseMessage, contactId);

    const cached = queryClient.getQueryData<{
      pages: { items: ConversationMessage[] }[];
    }>(queryKeys.conversations.contactMessages(contactId, 0));

    expect(cached?.pages[0]?.items).toHaveLength(1);
    expect(cached?.pages[0]?.items[0]?.text).toBe("Hello");
  });

  it("resolves contactId from unified thread cache for realtime events", () => {
    const queryClient = new QueryClient();
    const contactId = "contact-1";

    queryClient.setQueryData(queryKeys.conversations.unifiedList(), {
      items: [
        {
          threadKey: contactId,
          contactId,
          contact: { id: contactId, label: "Jane", avatarUrl: null },
          channels: ["WHATSAPP"],
          conversations: [{ id: conversationId }],
          primaryConversationId: conversationId,
          status: "OPEN",
          assignedToUserId: null,
          assignedTo: null,
          lastMessageAt: null,
          lastMessagePreview: null,
          unreadCount: 0,
        },
      ],
    });

    queryClient.setQueryData(queryKeys.conversations.contactMessages(contactId, 0), {
      pages: [{ items: [] }],
      pageParams: [""],
    });

    handleRealtimeEvent(queryClient, {
      event: "conversation.message.received",
      data: { conversationId, message: baseMessage },
      at: new Date().toISOString(),
    });

    const cached = queryClient.getQueryData<{
      pages: { items: ConversationMessage[] }[];
    }>(queryKeys.conversations.contactMessages(contactId, 0));

    expect(cached?.pages[0]?.items).toHaveLength(1);
  });
});
