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
      key: "payments",
      route: "/business/payments",
      icon: "credit-card",
      labelKey: "nav.payments",
      order: 40,
      requiredRoles: ["ADMIN"],
    },
    {
      key: "time-clock",
      route: "/business/time-clock",
      icon: "clock",
      labelKey: "nav.timeClock",
      order: 50,
    },
  ];

  it("sorts visible primary items by order and drops hidden/unknown routes", () => {
    const { sections, appsItems } = resolveSnapshotNavigation({
      navigation: baseNav,
      resolveLabel,
      businessRole: "ADMIN",
    });

    const titles = sections[0]?.items.map((item) => item.title) ?? [];
    expect(titles).toEqual([
      "nav.dashboard:dashboard",
      "nav.contacts:contacts",
    ]);
    expect(appsItems.map((item) => item.href)).toEqual(
      expect.arrayContaining(["/business/payments", "/business/time-clock"]),
    );
  });

  it("falls back to default icon for unknown icon keys", () => {
    const { sections } = resolveSnapshotNavigation({
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
      businessRole: "ADMIN",
    });

    expect(
      sections[0].items[0].icon.displayName ?? sections[0].items[0].icon.name,
    ).toBeTruthy();
    expect(sections[0].items).toHaveLength(1);
  });

  it("filters items by requiredRoles unless platform admin", () => {
    const memberResult = resolveSnapshotNavigation({
      navigation: baseNav,
      resolveLabel,
      businessRole: "MEMBER",
      staffPermissions: {
        "appointments.access": true,
        "contacts.view_last_names": true,
        "time_clock.access": true,
      },
    });
    expect(
      memberResult.appsItems.some((i) => i.href === "/business/payments"),
    ).toBe(false);
    expect(
      memberResult.appsItems.some((i) => i.href === "/business/time-clock"),
    ).toBe(true);

    const adminResult = resolveSnapshotNavigation({
      navigation: baseNav,
      resolveLabel,
      businessRole: "ADMIN",
    });
    expect(
      adminResult.appsItems.some((i) => i.href === "/business/payments"),
    ).toBe(true);

    const platformResult = resolveSnapshotNavigation({
      navigation: baseNav,
      resolveLabel,
      businessRole: "MEMBER",
      isPlatformAdmin: true,
    });
    expect(
      platformResult.appsItems.some((i) => i.href === "/business/payments"),
    ).toBe(true);
  });

  it("keeps time-clock as a known apps route", () => {
    const { appsItems } = resolveSnapshotNavigation({
      navigation: [
        {
          key: "time-clock",
          route: "/business/time-clock",
          icon: "clock",
          labelKey: "nav.timeClock",
          order: 0,
        },
      ],
      resolveLabel,
      businessRole: "ADMIN",
    });

    expect(appsItems).toHaveLength(1);
    expect(appsItems[0]?.href).toBe("/business/time-clock");
  });
});
