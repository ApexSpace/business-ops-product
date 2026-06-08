import { describe, expect, it } from "vitest";
import { resolveSnapshotNavigation } from "./resolve-snapshot-navigation";
import type { SnapshotNavItem } from "@/features/platform/types/snapshot";

const resolveLabel = (key: string, fallback: string) => `${key}:${fallback}`;

describe("resolveSnapshotNavigation", () => {
  const baseNav: SnapshotNavItem[] = [
    {
      key: "dashboard",
      route: "/business/dashboard",
      icon: "layout-dashboard",
      labelKey: "nav.dashboard",
      order: 0,
    },
    {
      key: "contacts",
      route: "/business/contacts",
      icon: "contact",
      labelKey: "nav.contacts",
      order: 20,
    },
    {
      key: "hidden",
      route: "/business/contacts",
      icon: "contact",
      labelKey: "nav.hidden",
      order: 10,
      visible: false,
    },
    {
      key: "unknown",
      route: "/business/unknown-route",
      icon: "contact",
      labelKey: "nav.unknown",
      order: 30,
    },
    {
      key: "admin-only",
      route: "/business/payments",
      icon: "credit-card",
      labelKey: "nav.payments",
      order: 40,
      requiredRoles: ["ADMIN"],
    },
  ];

  it("sorts visible items by order and drops hidden/unknown routes", () => {
    const sections = resolveSnapshotNavigation({
      navigation: baseNav,
      resolveLabel,
      businessRole: "MEMBER",
    });

    const titles = sections[0].items.map((item) => item.title);
    expect(titles).toEqual([
      "nav.dashboard:dashboard",
      "nav.contacts:contacts",
    ]);
  });

  it("falls back to default icon for unknown icon keys", () => {
    const sections = resolveSnapshotNavigation({
      navigation: [
        {
          key: "dashboard",
          route: "/business/dashboard",
          icon: "not-a-real-icon",
          labelKey: "nav.dashboard",
          order: 0,
        },
      ],
      resolveLabel,
    });

    expect(sections[0].items[0].icon.displayName ?? sections[0].items[0].icon.name).toBeTruthy();
    expect(sections[0].items).toHaveLength(1);
  });

  it("filters items by requiredRoles unless platform admin", () => {
    const memberSections = resolveSnapshotNavigation({
      navigation: baseNav,
      resolveLabel,
      businessRole: "MEMBER",
    });
    expect(memberSections[0].items.some((i) => i.href === "/business/payments")).toBe(
      false,
    );

    const adminSections = resolveSnapshotNavigation({
      navigation: baseNav,
      resolveLabel,
      businessRole: "ADMIN",
    });
    expect(adminSections[0].items.some((i) => i.href === "/business/payments")).toBe(
      true,
    );

    const platformSections = resolveSnapshotNavigation({
      navigation: baseNav,
      resolveLabel,
      businessRole: "MEMBER",
      isPlatformAdmin: true,
    });
    expect(
      platformSections[0].items.some((i) => i.href === "/business/payments"),
    ).toBe(true);
  });
});
