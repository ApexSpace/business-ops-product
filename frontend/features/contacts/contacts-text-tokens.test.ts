import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("contacts list text tokens (TXT-03, TXT-17)", () => {
  it("uses heading-violet names and secondary email/phone, not cell hex", () => {
    const page = readFileSync(
      "features/contacts/pages/contacts-page.tsx",
      "utf8",
    );
    expect(page).toContain("text-violet-primary-darker");
    expect(page).toContain("text-[var(--drawer-text-secondary)]");
    expect(page).not.toMatch(/text-\[#4A4A4A\]/i);
  });

  it("uses muted idle tabs and violet active tabs, not raw grey hex", () => {
    const css = readFileSync(
      "features/contacts/styles/contacts-split-layout.css",
      "utf8",
    );
    expect(css).toContain("color: var(--muted-foreground)");
    expect(css).toContain("color: var(--pc-violet-primary-normal)");
    expect(css).not.toMatch(/color:\s*#6b6b6b/i);
  });
});
