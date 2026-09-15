import { describe, expect, it } from "vitest";
import type { ConversationMessage } from "@/features/conversations/api/conversations.api";
import type { ConversationNote } from "@/features/conversations/api/conversation-notes.api";
import { buildThreadTimeline } from "@/features/conversations/utils/thread-timeline";

function message(
  id: string,
  createdAt: string,
): ConversationMessage {
  return {
    id,
    conversationId: "c1",
    channel: "EMAIL",
    providerKey: "email",
    direction: "INBOUND",
    senderType: "CONTACT",
    senderUserId: null,
    text: id,
    attachments: null,
    status: "RECEIVED",
    errorMessage: null,
    sentAt: null,
    receivedAt: createdAt,
    createdAt,
  };
}

function note(id: string, createdAt: string): ConversationNote {
  return {
    id,
    conversationId: "c1",
    body: id,
    author: {
      id: "u1",
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
    },
    createdAt,
    updatedAt: createdAt,
  };
}

describe("buildThreadTimeline", () => {
  it("interleaves notes with messages by createdAt", () => {
    const timeline = buildThreadTimeline(
      [message("m1", "2026-08-25T10:00:00.000Z"), message("m2", "2026-08-25T12:00:00.000Z")],
      [note("n1", "2026-08-25T11:00:00.000Z")],
    );

    expect(timeline.map((entry) => entry.id)).toEqual([
      "message:m1",
      "note:n1",
      "message:m2",
    ]);
  });

  it("keeps messages before notes when timestamps match", () => {
    const at = "2026-08-25T10:00:00.000Z";
    const timeline = buildThreadTimeline([message("m1", at)], [note("n1", at)]);
    expect(timeline.map((entry) => entry.kind)).toEqual(["message", "note"]);
  });
});
