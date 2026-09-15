import { describe, expect, it } from "vitest";
import {
  INBOX_COMPOSER_FOOTER_CLASS,
  INBOX_COMPOSER_SURFACE_CLASS,
} from "@/features/conversations/styles/inbox-tokens";

describe("inbox composer surface", () => {
  it("uses Figma white panel fill, not page-grey bg-background", () => {
    expect(INBOX_COMPOSER_SURFACE_CLASS).toContain("bg-white");
    expect(INBOX_COMPOSER_SURFACE_CLASS).not.toContain("bg-background");
    expect(INBOX_COMPOSER_SURFACE_CLASS).not.toContain("bg-card");
  });

  it("keeps the thread composer footer on the same white surface", () => {
    expect(INBOX_COMPOSER_FOOTER_CLASS).toContain("bg-white");
  });
});
