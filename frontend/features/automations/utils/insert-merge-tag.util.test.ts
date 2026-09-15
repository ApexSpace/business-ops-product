import { describe, expect, it } from "vitest";
import {
  formatMergeTag,
  insertMergeTagAtCursor,
} from "@/features/automations/utils/insert-merge-tag.util";

describe("insert merge tag utils", () => {
  it("formats merge tags with braces", () => {
    expect(formatMergeTag("contact.first_name")).toBe("{{contact.first_name}}");
    expect(formatMergeTag("{{contact.first_name}}")).toBe(
      "{{contact.first_name}}",
    );
  });

  it("inserts a merge tag at the cursor", () => {
    const result = insertMergeTagAtCursor(
      "Hi ",
      "contact.first_name",
      3,
      3,
    );
    expect(result.value).toBe("Hi {{contact.first_name}}");
    expect(result.cursor).toBe(25);
  });

  it("replaces the selected range when inserting", () => {
    const result = insertMergeTagAtCursor(
      "Hello NAME",
      "contact.first_name",
      6,
      10,
    );
    expect(result.value).toBe("Hello {{contact.first_name}}");
    expect(result.cursor).toBe(28);
  });
});
