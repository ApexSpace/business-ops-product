import { describe, expect, it } from "vitest";
import type { ConversationMessage } from "@/features/conversations/api/conversations.api";
import { isDeletableConversationMessage } from "@/features/conversations/utils/message-delete.util";

function message(
  senderType: ConversationMessage["senderType"],
): ConversationMessage {
  return {
    id: "m1",
    conversationId: "c1",
    channel: "WEBCHAT",
    providerKey: "webchat",
    direction: senderType === "CONTACT" ? "INBOUND" : "OUTBOUND",
    senderType,
    senderUserId: null,
    text: "hi",
    attachments: null,
    status: "SENT",
    errorMessage: null,
    sentAt: null,
    receivedAt: null,
    createdAt: new Date().toISOString(),
  };
}

describe("isDeletableConversationMessage", () => {
  it("allows contact and staff messages", () => {
    expect(isDeletableConversationMessage(message("CONTACT"))).toBe(true);
    expect(isDeletableConversationMessage(message("USER"))).toBe(true);
  });

  it("blocks automated system and AI messages", () => {
    expect(isDeletableConversationMessage(message("SYSTEM"))).toBe(false);
    expect(isDeletableConversationMessage(message("AI_AGENT"))).toBe(false);
  });
});
