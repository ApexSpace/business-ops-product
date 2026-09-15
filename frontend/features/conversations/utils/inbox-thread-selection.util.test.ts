import { describe, expect, it } from "vitest";
import type { UnifiedConversationThread } from "@/features/conversations/api/conversations.api";
import {
  buildInboxThreadSearchParams,
  resolveActiveInboxThread,
} from "./inbox-thread-selection.util";

const thread: UnifiedConversationThread = {
  threadKey: "contact-1",
  contactId: "contact-1",
  contact: { id: "contact-1", label: "Shahbaz Baig", avatarUrl: null },
  channels: ["WHATSAPP", "EMAIL"],
  conversations: [
    {
      id: "wa-conv",
      businessId: "biz",
      contactId: "contact-1",
      channel: "WHATSAPP",
      providerKey: "whatsapp",
      resourceId: null,
      externalConversationId: "ext",
      externalParticipantId: "923",
      externalPageId: null,
      title: null,
      status: "OPEN",
      assignedToUserId: null,
      lastMessageAt: null,
      lastMessagePreview: null,
      unreadCount: 0,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "email-conv",
      businessId: "biz",
      contactId: "contact-1",
      channel: "EMAIL",
      providerKey: "email",
      resourceId: null,
      externalConversationId: "ext2",
      externalParticipantId: "user@example.com",
      externalPageId: null,
      title: "Hello",
      status: "OPEN",
      assignedToUserId: null,
      lastMessageAt: null,
      lastMessagePreview: null,
      unreadCount: 0,
      createdAt: "",
      updatedAt: "",
    },
  ],
  primaryConversationId: "email-conv",
  status: "OPEN",
  assignedToUserId: null,
  assignedTo: null,
  lastMessageAt: "2026-06-11T12:00:00.000Z",
  lastMessagePreview: "Latest",
  unreadCount: 2,
};

const olderThread: UnifiedConversationThread = {
  ...thread,
  threadKey: "contact-2",
  contactId: "contact-2",
  contact: { id: "contact-2", label: "Other", avatarUrl: null },
  channels: ["WHATSAPP"],
  conversations: [
    {
      ...thread.conversations[0],
      id: "other-conv",
      contactId: "contact-2",
    },
  ],
  primaryConversationId: "other-conv",
  lastMessageAt: "2026-06-01T12:00:00.000Z",
};

describe("resolveActiveInboxThread", () => {
  it("returns undefined while the thread list is still loading", () => {
    expect(
      resolveActiveInboxThread({
        threads: [thread],
        threadsReady: false,
        manualThreadKey: null,
        threadFromQuery: null,
        conversationFromQuery: "email-conv",
      }),
    ).toBeUndefined();
  });

  it("resolves a legacy conversation query param to the unified contact thread", () => {
    expect(
      resolveActiveInboxThread({
        threads: [olderThread, thread],
        threadsReady: true,
        manualThreadKey: null,
        threadFromQuery: null,
        conversationFromQuery: "email-conv",
      })?.threadKey,
    ).toBe("contact-1");
  });

  it("prefers an explicit thread query param", () => {
    expect(
      resolveActiveInboxThread({
        threads: [olderThread, thread],
        threadsReady: true,
        manualThreadKey: null,
        threadFromQuery: "contact-2",
        conversationFromQuery: "email-conv",
      })?.threadKey,
    ).toBe("contact-2");
  });

  it("prefers a manual selection over URL params", () => {
    expect(
      resolveActiveInboxThread({
        threads: [olderThread, thread],
        threadsReady: true,
        manualThreadKey: "contact-2",
        threadFromQuery: "contact-1",
        conversationFromQuery: "email-conv",
      })?.threadKey,
    ).toBe("contact-2");
  });

  it("defaults to the first thread when no selection is provided", () => {
    expect(
      resolveActiveInboxThread({
        threads: [thread, olderThread],
        threadsReady: true,
        manualThreadKey: null,
        threadFromQuery: null,
        conversationFromQuery: null,
      })?.threadKey,
    ).toBe("contact-1");
  });
});

describe("buildInboxThreadSearchParams", () => {
  it("writes thread and primary conversation keys for contact threads", () => {
    const params = buildInboxThreadSearchParams(
      thread,
      new URLSearchParams("filter=open"),
    );
    expect(params.get("thread")).toBe("contact-1");
    expect(params.get("conversation")).toBe("email-conv");
    expect(params.get("filter")).toBe("open");
  });

  it("drops conversation for orphan threads without a contact", () => {
    const orphan: UnifiedConversationThread = {
      ...thread,
      threadKey: "orphan-conv",
      contactId: null,
      contact: null,
      primaryConversationId: "orphan-conv",
      conversations: [thread.conversations[0]],
    };
    const params = buildInboxThreadSearchParams(
      orphan,
      new URLSearchParams("conversation=stale"),
    );
    expect(params.get("thread")).toBe("orphan-conv");
    expect(params.get("conversation")).toBeNull();
  });
});
