import { describe, expect, it } from "vitest";
import type {
  ContactReplyChannel,
  ConversationMessage,
  UnifiedConversationThread,
} from "@/features/conversations/api/conversations.api";
import {
  canSendViaReplyChannel,
  findReplyChannel,
  pickDefaultReplyChannel,
  replyChannelSendDisabledReason,
} from "./reply-channel.utils";

const whatsappChannel: ContactReplyChannel = {
  channel: "WHATSAPP",
  providerKey: "whatsapp",
  conversationId: "conv-wa",
  readyForMessaging: true,
  messagingStatus: {
    connected: true,
    defaultResourceSelected: true,
    webhookEndpointConfigured: true,
    requiredPermissionsPresent: true,
    readyForMessaging: true,
    warnings: [],
  },
  unavailableReason: null,
};

const emailChannel: ContactReplyChannel = {
  channel: "EMAIL",
  providerKey: "email",
  conversationId: null,
  readyForMessaging: true,
  messagingStatus: {
    connected: true,
    defaultResourceSelected: true,
    webhookEndpointConfigured: true,
    requiredPermissionsPresent: true,
    readyForMessaging: true,
    warnings: [],
  },
  unavailableReason: null,
};

const thread: UnifiedConversationThread = {
  threadKey: "contact-1",
  contactId: "contact-1",
  contact: { id: "contact-1", label: "Jane Doe", avatarUrl: null },
  channels: ["WHATSAPP", "EMAIL"],
  conversations: [
    {
      id: "conv-wa",
      businessId: "biz-1",
      contactId: "contact-1",
      channel: "WHATSAPP",
      providerKey: "whatsapp",
      resourceId: null,
      externalConversationId: "wa-1",
      externalParticipantId: "user-1",
      externalPageId: null,
      title: null,
      status: "OPEN",
      assignedToUserId: null,
      lastMessageAt: null,
      lastMessagePreview: null,
      unreadCount: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  primaryConversationId: "conv-wa",
  status: "OPEN",
  assignedToUserId: null,
  assignedTo: null,
  lastMessageAt: null,
  lastMessagePreview: null,
  unreadCount: 0,
};

describe("reply-channel.utils", () => {
  it("picks the channel from the latest message when available", () => {
    const messages: ConversationMessage[] = [
      {
        id: "msg-1",
        conversationId: "conv-email",
        channel: "EMAIL",
        providerKey: "email",
        direction: "INBOUND",
        senderType: "CONTACT",
        senderUserId: null,
        text: "Hi",
        attachments: null,
        status: "RECEIVED",
        errorMessage: null,
        sentAt: null,
        receivedAt: "2026-01-02T00:00:00.000Z",
        createdAt: "2026-01-02T00:00:00.000Z",
      },
    ];

    expect(
      pickDefaultReplyChannel([whatsappChannel, emailChannel], thread, messages),
    ).toBe("EMAIL");
  });

  it("falls back to the primary conversation channel", () => {
    expect(
      pickDefaultReplyChannel([whatsappChannel, emailChannel], thread, []),
    ).toBe("WHATSAPP");
  });

  it("finds a reply channel by channel type", () => {
    expect(findReplyChannel([whatsappChannel, emailChannel], "EMAIL")).toEqual(
      emailChannel,
    );
  });

  it("reports unavailable reasons for blocked channels", () => {
    const blocked: ContactReplyChannel = {
      ...whatsappChannel,
      readyForMessaging: false,
      unavailableReason: "Customer must message first.",
    };

    expect(replyChannelSendDisabledReason(blocked, undefined)).toBe(
      "Customer must message first.",
    );
  });

  it("allows send when channel is ready and composer has content", () => {
    expect(canSendViaReplyChannel(whatsappChannel, undefined, true)).toBe(true);
    expect(canSendViaReplyChannel(whatsappChannel, undefined, false)).toBe(
      false,
    );
  });
});
