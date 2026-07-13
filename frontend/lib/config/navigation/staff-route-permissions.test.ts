import { describe, expect, it } from "vitest";
import {
  canAccessBusinessStaffRoute,
  resolveBusinessRouteStaffPermission,
} from "@/lib/config/navigation/staff-route-permissions";

describe("staff route permissions", () => {
  it("requires contacts.access for contacts routes", () => {
    expect(resolveBusinessRouteStaffPermission("/business/contacts")).toBe(
      "contacts.access",
    );
    expect(
      canAccessBusinessStaffRoute("/business/contacts", {
        businessRole: "MEMBER",
        staffPermissions: {},
      }),
    ).toBe(false);
    expect(
      canAccessBusinessStaffRoute("/business/contacts", {
        businessRole: "MEMBER",
        staffPermissions: { "contacts.access": true },
      }),
    ).toBe(true);
  });

  it("allows admins all routes", () => {
    expect(
      canAccessBusinessStaffRoute("/business/payments", {
        businessRole: "ADMIN",
        staffPermissions: {},
      }),
    ).toBe(true);
  });

  it("gates settings via settings helpers", () => {
    expect(
      canAccessBusinessStaffRoute("/business/settings/profile", {
        businessRole: "MEMBER",
        staffPermissions: {},
      }),
    ).toBe(false);
    expect(
      canAccessBusinessStaffRoute("/business/settings/appearance", {
        businessRole: "MEMBER",
        staffPermissions: {},
      }),
    ).toBe(true);
  });
});
