import { describe, expect, it } from "vitest";
import {
  groupAppsPanelSections,
  resolveNavbarNavItems,
} from "./business-nav-catalog";
import { isNavbarCorePriority } from "./navbar-overflow";
import {
  PLATFORM_NAV_CATALOG,
  resolvePlatformAppsItems,
} from "./platform-nav-catalog";

describe("platform nav catalog", () => {
  it("only lists real platform hrefs", () => {
    for (const entry of PLATFORM_NAV_CATALOG) {
      expect(entry.href.startsWith("/platform/")).toBe(true);
    }
  });

  it("keeps Reports-equivalent directory items out of the core set", () => {
    const coreKeys = PLATFORM_NAV_CATALOG.filter((entry) =>
      isNavbarCorePriority(entry.navbarPriority),
    ).map((entry) => entry.navKey);

    expect(coreKeys).toEqual([
      "dashboard",
      "operations",
      "businesses",
      "users",
      "inbox",
    ]);
    expect(coreKeys).not.toContain("tiers");
    expect(coreKeys).not.toContain("work-items");
  });

  it("orders every catalog item for progressive navbar packing", () => {
    const items = resolvePlatformAppsItems();
    expect(resolveNavbarNavItems(items).map((entry) => entry.navKey)).toEqual(
      PLATFORM_NAV_CATALOG.map((entry) => entry.navKey),
    );
  });

  it("groups platform apps into the shared categories", () => {
    const sections = groupAppsPanelSections(resolvePlatformAppsItems());
    expect(sections.map((section) => section.id)).toEqual([
      "frequently-used",
      "core",
      "marketing",
      "setup",
    ]);
  });
});
