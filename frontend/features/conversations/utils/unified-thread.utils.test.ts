import { describe, expect, it } from "vitest";
import {
  findUnifiedThreadByConversationId,
  unifiedThreadDisplayName,
} from "./unified-thread.utils";
import type { UnifiedConversationThread } from "@/features/conversations/api/conversations.api";

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

describe("unified-thread.utils", () => {
  it("uses contact label for display name", () => {
    expect(unifiedThreadDisplayName(thread)).toBe("Shahbaz Baig");
  });

  it("finds a thread by primary or child conversation id", () => {
    expect(findUnifiedThreadByConversationId([thread], "wa-conv")?.threadKey).toBe(
      "contact-1",
    );
    expect(
      findUnifiedThreadByConversationId([thread], "email-conv")?.threadKey,
    ).toBe("contact-1");
  });
});
