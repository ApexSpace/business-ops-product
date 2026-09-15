import { describe, expect, it } from "vitest";
import {
  APPS_LAUNCHER_FOOTER_CLASS,
  APPS_LAUNCHER_MANAGE_CLASS,
} from "@/lib/design/apps-launcher-tokens";

describe("apps launcher footer", () => {
  it("stretches the footer full width on all breakpoints", () => {
    expect(APPS_LAUNCHER_FOOTER_CLASS).toContain("w-full");
    expect(APPS_LAUNCHER_FOOTER_CLASS).toContain("sm:!justify-start");
    expect(APPS_LAUNCHER_FOOTER_CLASS).toContain("!p-0");
  });

  it("makes Manage apps a full-width centered bar", () => {
    expect(APPS_LAUNCHER_MANAGE_CLASS).toContain("w-full");
    expect(APPS_LAUNCHER_MANAGE_CLASS).toContain("justify-center");
    expect(APPS_LAUNCHER_MANAGE_CLASS).toContain("--control-height");
    expect(APPS_LAUNCHER_MANAGE_CLASS).toContain("--spacing-3");
    expect(APPS_LAUNCHER_MANAGE_CLASS).toContain("--radius-xs");
    expect(APPS_LAUNCHER_MANAGE_CLASS).toContain("border-border");
  });
});
