import { describe, expect, it } from "vitest";
import type { ConversationMessage } from "@/features/conversations/api/conversations.api";
import { isConversationActivityMessage } from "@/features/conversations/utils/conversation-activity.util";

function message(
  overrides: Partial<ConversationMessage> = {},
): ConversationMessage {
  return {
    id: "m1",
    conversationId: "c1",
    channel: "WEBCHAT",
    providerKey: "webchat",
    direction: "OUTBOUND",
    senderType: "SYSTEM",
    senderUserId: null,
    text: "You blocked this contact",
    attachments: null,
    status: "SENT",
    errorMessage: null,
    sentAt: new Date().toISOString(),
    receivedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("isConversationActivityMessage", () => {
  it("detects SYSTEM messages with activityType", () => {
    expect(
      isConversationActivityMessage(
        message({ activityType: "CONTACT_BLOCKED" }),
      ),
    ).toBe(true);
  });

  it("ignores SYSTEM bot replies without activityType", () => {
    expect(isConversationActivityMessage(message())).toBe(false);
    expect(
      isConversationActivityMessage(message({ activityType: null })),
    ).toBe(false);
  });

  it("ignores non-SYSTEM senders", () => {
    expect(
      isConversationActivityMessage(
        message({ senderType: "USER", activityType: "CLOSED" }),
      ),
    ).toBe(false);
  });
});
