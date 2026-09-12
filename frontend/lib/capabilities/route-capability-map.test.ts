import { describe, expect, it } from "vitest";
import { STAFF_PERMISSION_KEYS } from "@/features/team/permissions/staff-permission-registry";
import {
  canAccessBusinessRoute,
  getMappedRoutes,
  getRouteCapabilityEntry,
  resolveRouteCapability,
} from "./route-capability-map";

/** Staff keys that are not registry capability/module option keys. */
const STAFF_ONLY_KEYS = new Set(
  STAFF_PERMISSION_KEYS.filter(
    (key) =>
      key !== "sales.access" &&
      key !== "reports.access" &&
      key !== "conversations.send",
  ),
);

const APPOINTMENT_SETTINGS_ROUTES = [
  "/business/settings/waiting-room",
  "/business/settings/appointment-booked",
  "/business/settings/cancel-reschedule",
  "/business/settings/quick-tools",
] as const;

describe("route capability map (C-P0-02 / CAP-01 / CAP-02 / CAP-03)", () => {
  it("does not use staff-only keys as capability option keys", () => {
    for (const route of getMappedRoutes()) {
      const entry = getRouteCapabilityEntry(route);
      expect(entry, route).toBeDefined();
      for (const key of entry!.capabilityKeys) {
        expect(
          STAFF_ONLY_KEYS.has(key),
          `${route} maps staff-only key ${key}`,
        ).toBe(false);
      }
    }
  });

  it("CAP-01: /business/appointments is the appointments module, not payments", () => {
    const entry = getRouteCapabilityEntry("/business/appointments");
    expect(entry?.moduleKey).toBe("appointments");
    expect(entry?.moduleKey).not.toBe("payments");
    expect(entry?.capabilityKeys).toEqual(["appointments.list"]);

    const withoutAppointments = new Set(["payments.transactions.list", "contacts.list"]);
    expect(
      canAccessBusinessRoute("/business/appointments", withoutAppointments),
    ).toBe(false);
  });

  it("CAP-02: appointments.list does not grant express booking", () => {
    const listOnly = new Set(["appointments.list"]);
    expect(
      canAccessBusinessRoute("/business/settings/express-booking", listOnly),
    ).toBe(false);

    const withExpress = new Set(["appointments.list", "appointments.express_booking"]);
    expect(
      canAccessBusinessRoute("/business/settings/express-booking", withExpress),
    ).toBe(true);

    const entry = getRouteCapabilityEntry("/business/settings/express-booking");
    expect(entry?.capabilityKeys).toEqual(["appointments.express_booking"]);
  });

  it("CAP-03: appointments.list grants waiting-room, booked, cancel-reschedule, quick-tools", () => {
    const listOnly = new Set(["appointments.list"]);
    for (const route of APPOINTMENT_SETTINGS_ROUTES) {
      const entry = getRouteCapabilityEntry(route);
      expect(entry?.moduleKey, route).toBe("appointments");
      expect(entry?.capabilityKeys, route).toEqual(["appointments.list"]);
      expect(canAccessBusinessRoute(route, listOnly), route).toBe(true);
    }
  });

  it("does not treat appointments.access or payments.access as entitlements", () => {
    const staffKeys = new Set(["appointments.access", "payments.access"]);
    for (const route of APPOINTMENT_SETTINGS_ROUTES) {
      expect(canAccessBusinessRoute(route, staffKeys), route).toBe(false);
    }
    expect(
      canAccessBusinessRoute("/business/settings/payment-account", staffKeys),
    ).toBe(false);
    expect(canAccessBusinessRoute("/business/appointments", staffKeys)).toBe(
      false,
    );
  });

  it("maps payment-account to payments.transactions.list", () => {
    const entry = getRouteCapabilityEntry("/business/settings/payment-account");
    expect(entry?.moduleKey).toBe("payments");
    expect(entry?.capabilityKeys).toEqual(["payments.transactions.list"]);
    expect(
      canAccessBusinessRoute(
        "/business/settings/payment-account",
        new Set(["payments.transactions.list"]),
      ),
    ).toBe(true);
    expect(
      canAccessBusinessRoute(
        "/business/settings/payment-account",
        new Set(["appointments.list"]),
      ),
    ).toBe(false);
  });

  it("does not grant a feature route from any other key in the same module", () => {
    const waitlistOnly = new Set(["appointments.waitlist"]);
    expect(canAccessBusinessRoute("/business/appointments", waitlistOnly)).toBe(
      false,
    );
    expect(
      canAccessBusinessRoute("/business/settings/express-booking", waitlistOnly),
    ).toBe(false);
    expect(
      canAccessBusinessRoute("/business/settings/waiting-room", waitlistOnly),
    ).toBe(false);
  });

  it("resolves nested appointment paths with the same module keys", () => {
    const nested = resolveRouteCapability("/business/appointments/abc");
    expect(nested?.moduleKey).toBe("appointments");
    expect(nested?.capabilityKeys).toEqual(["appointments.list"]);
    expect(
      canAccessBusinessRoute(
        "/business/appointments/abc",
        new Set(["appointments.list"]),
      ),
    ).toBe(true);
    expect(
      canAccessBusinessRoute("/business/appointments/abc", new Set()),
    ).toBe(false);
  });
});
