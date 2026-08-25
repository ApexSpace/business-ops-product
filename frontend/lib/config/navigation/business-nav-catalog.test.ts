import { describe, expect, it } from "vitest";
import {
  BUSINESS_NAV_CATALOG,
  filterAppsPanelItems,
  groupAppsPanelSections,
  navbarPriorityVisibilityClass,
  resolveNavbarNavItems,
  resolveSettingsAppsItems,
} from "./business-nav-catalog";
import { BUSINESS_APPS_NAV_KEYS, BUSINESS_PRIMARY_NAV_KEYS } from "./business-nav-sections";
import { businessSettingsNavItems } from "./business-settings-menu";
import { LayoutDashboard } from "lucide-react";
import type { ShellNavItem } from "@/lib/types/shell-nav";

const MOVED_FROM_SETTINGS = [
  "/business/settings/services",
  "/business/settings/team",
  "/business/settings/pipelines",
  "/business/settings/automations",
  "/business/settings/forms",
  "/business/settings/resources",
  "/business/settings/integrations",
];

function item(
  href: string,
  extra: Partial<ShellNavItem> = {},
): ShellNavItem {
  return {
    title: href,
    href,
    icon: LayoutDashboard,
    ...extra,
  };
}

describe("business nav catalog", () => {
  it("only lists real application hrefs", () => {
    for (const entry of BUSINESS_NAV_CATALOG) {
      expect(entry.href.startsWith("/business/")).toBe(true);
    }
  });

  it("keeps snapshot primary keys aligned with navbar priorities 1–3", () => {
    const primaryFromCatalog = BUSINESS_NAV_CATALOG.filter(
      (entry) =>
        entry.origin === "operational" &&
        entry.navbarPriority != null &&
        entry.navbarPriority <= 3,
    ).map((entry) => entry.navKey);

    expect(primaryFromCatalog).toEqual([...BUSINESS_PRIMARY_NAV_KEYS]);
  });

  it("keeps snapshot apps keys aligned with operational apps-only entries", () => {
    const appsFromCatalog = BUSINESS_NAV_CATALOG.filter(
      (entry) =>
        entry.origin === "operational" &&
        (entry.navbarPriority == null || entry.navbarPriority > 3),
    ).map((entry) => entry.navKey);

    expect(appsFromCatalog).toEqual([...BUSINESS_APPS_NAV_KEYS]);
  });

  it("groups frequently used, core, marketing, and setup without placeholders", () => {
    const items = BUSINESS_NAV_CATALOG.map((entry) =>
      item(entry.href, { navKey: entry.navKey, title: entry.title }),
    );
    const sections = groupAppsPanelSections(items);
    const ids = sections.map((section) => section.id);

    expect(ids).toEqual([
      "frequently-used",
      "core",
      "marketing",
      "setup",
    ]);
    expect(
      sections.find((section) => section.id === "frequently-used")?.items.map(
        (entry) => entry.navKey,
      ),
    ).toEqual([
      "dashboard",
      "appointments",
      "contacts",
      "conversations",
      "sales",
    ]);
    expect(
      sections
        .find((section) => section.id === "setup")
        ?.items.map((entry) => entry.href),
    ).toEqual(
      expect.arrayContaining([
        "/business/settings",
        "/business/settings/team",
        "/business/settings/services",
        "/business/settings/pipelines",
        "/business/settings/resources",
        "/business/settings/integrations",
      ]),
    );
  });

  it("orders navbar items by progressive priority", () => {
    const items = BUSINESS_NAV_CATALOG.filter(
      (entry) => entry.navbarPriority != null,
    ).map((entry) => item(entry.href, { navKey: entry.navKey }));

    expect(resolveNavbarNavItems(items).map((entry) => entry.navKey)).toEqual([
      "dashboard",
      "appointments",
      "contacts",
      "conversations",
      "sales",
      "reports",
      "products",
    ]);
  });

  it("maps navbar priorities to existing breakpoint utilities", () => {
    expect(navbarPriorityVisibilityClass(1)).toBe("inline-flex");
    expect(navbarPriorityVisibilityClass(2)).toBe("hidden md:inline-flex");
    expect(navbarPriorityVisibilityClass(3)).toBe("hidden lg:inline-flex");
    expect(navbarPriorityVisibilityClass(4)).toBe("hidden xl:inline-flex");
    expect(navbarPriorityVisibilityClass(5)).toBe("hidden 2xl:inline-flex");
  });

  it("filters the apps panel by title", () => {
    const items = [
      item("/business/sales", { title: "Sales" }),
      item("/business/contacts", { title: "Contacts" }),
    ];
    expect(filterAppsPanelItems(items, "sal").map((entry) => entry.href)).toEqual(
      ["/business/sales"],
    );
  });

  it("removes moved modules from the settings sidebar", () => {
    const settingsHrefs = businessSettingsNavItems.map((entry) => entry.href);
    for (const href of MOVED_FROM_SETTINGS) {
      expect(settingsHrefs).not.toContain(href);
    }
  });

  it("gates settings catalog items for members without grants", () => {
    const items = resolveSettingsAppsItems({
      businessRole: "MEMBER",
      staffPermissions: {},
    });
    expect(items.some((entry) => entry.href === "/business/settings/team")).toBe(
      false,
    );
    expect(
      items.some((entry) => entry.href === "/business/settings/resources"),
    ).toBe(false);
    expect(
      items.some((entry) => entry.href === "/business/settings/integrations"),
    ).toBe(false);
    expect(items.some((entry) => entry.href === "/business/settings")).toBe(
      true,
    );
  });
});
