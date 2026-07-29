import { describe, expect, it } from "vitest";
import type { ConversationMessage } from "@/features/conversations/api/conversations.api";
import { mergeConversationMessagePages } from "@/features/conversations/utils/merge-message-pages";

function message(id: string, createdAt: string): ConversationMessage {
  return {
    id,
    createdAt,
    direction: "INBOUND",
    channel: "WHATSAPP",
    status: "DELIVERED",
    text: id,
  } as ConversationMessage;
}

describe("mergeConversationMessagePages", () => {
  it("orders pages oldest-first when loading with latest=true + direction=before", () => {
    const merged = mergeConversationMessagePages([
      { items: [message("c", "2026-01-03"), message("d", "2026-01-04")] },
      { items: [message("a", "2026-01-01"), message("b", "2026-01-02")] },
    ]);

    expect(merged.map((item) => item.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("dedupes overlapping message ids", () => {
    const merged = mergeConversationMessagePages([
      { items: [message("b", "2026-01-02")] },
      { items: [message("b", "2026-01-02"), message("a", "2026-01-01")] },
    ]);

    expect(merged.map((item) => item.id)).toEqual(["b", "a"]);
  });
});
