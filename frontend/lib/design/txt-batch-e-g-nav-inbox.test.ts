import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DRAWER_CLIENT_CREDIT_CARD_CLASS } from "@/lib/design/drawer-tokens";
import {
  WORKSPACE_NAV_ITEM_ACTIVE_CLASS,
  WORKSPACE_NAV_ITEM_IDLE_CLASS,
  WORKSPACE_NAV_SECTION_TRIGGER_CLASS,
} from "@/lib/design/workspace-nav-tokens";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const ASIDE_CONSUMERS = [
  "features/settings/components/settings-nav-panel.tsx",
  "features/team/components/team-sidebar.tsx",
  "features/services/components/settings/services-sidebar.tsx",
  "features/resources/components/resources-sidebar.tsx",
] as const;

describe("TXT-06 workspace nav idle labels", () => {
  it("uses grey-tertiary (muted), not primary foreground", () => {
    expect(WORKSPACE_NAV_ITEM_IDLE_CLASS).toContain("text-grey-tertiary-normal");
    expect(WORKSPACE_NAV_ITEM_IDLE_CLASS).not.toMatch(
      /(^|\s)text-foreground(\s|$)/,
    );
  });

  it("keeps active items violet and section headers on foreground", () => {
    expect(WORKSPACE_NAV_ITEM_ACTIVE_CLASS).toContain(
      "text-violet-primary-normal",
    );
    expect(WORKSPACE_NAV_SECTION_TRIGGER_CLASS).toContain("text-foreground");
  });

  it("is still the idle recipe for Settings / Team / Services / Resources asides", () => {
    for (const relativePath of ASIDE_CONSUMERS) {
      const src = readFileSync(join(frontendRoot, relativePath), "utf8");
      expect(src).toContain("WORKSPACE_NAV_ITEM_IDLE_CLASS");
    }
  });
});

describe("TXT-08 add credit card", () => {
  it("uses text-destructive instead of drawer primary ink", () => {
    expect(DRAWER_CLIENT_CREDIT_CARD_CLASS).toContain("text-destructive");
    expect(DRAWER_CLIENT_CREDIT_CARD_CLASS).not.toContain("drawer-text-primary");
  });

  it("paints the inbox credit-card row as destructive", () => {
    const src = readFileSync(
      join(
        frontendRoot,
        "features/conversations/components/inbox/conversation-details-sidebar.tsx",
      ),
      "utf8",
    );
    expect(src).toContain("DRAWER_CLIENT_CREDIT_CARD_CLASS");
    expect(src).toMatch(/CreditCard[\s\S]*text-destructive/);
  });
});

describe("TXT-12 conversation list heading", () => {
  it("uses text-violet-primary-normal", () => {
    const src = readFileSync(
      join(
        frontendRoot,
        "features/conversations/components/inbox/conversation-list-panel.tsx",
      ),
      "utf8",
    );
    expect(src).toMatch(/<h2 className="[^"]*text-violet-primary-normal"/);
    expect(src).not.toMatch(/<h2 className="[^"]*text-violet-primary-dark"/);
  });
});
