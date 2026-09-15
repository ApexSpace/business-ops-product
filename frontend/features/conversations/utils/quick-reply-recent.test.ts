import { describe, expect, it } from "vitest";
import { sortQuickReplies } from "@/features/conversations/utils/quick-reply-recent";

describe("sortQuickReplies", () => {
  const items = [
    { id: "a", title: "Thanks" },
    { id: "b", title: "Appointment reminder" },
    { id: "c", title: "Welcome" },
  ];

  it("sorts alphabetically", () => {
    expect(sortQuickReplies(items, "alpha", []).map((i) => i.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("puts recently used first, then alphabetical for unused", () => {
    expect(
      sortQuickReplies(items, "recent", ["c", "a"]).map((i) => i.id),
    ).toEqual(["c", "a", "b"]);
  });
});
