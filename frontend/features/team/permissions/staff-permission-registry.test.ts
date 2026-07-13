import { describe, expect, it } from "vitest";
import {
  canAccessSettingsHref,
  hasStaffPermission,
  normalizeStaffPermissions,
} from "@/features/team/permissions/staff-permission-registry";

describe("staff permission helpers", () => {
  it("normalizes permission map", () => {
    const map = normalizeStaffPermissions({ "contacts.access": true });
    expect(map["contacts.access"]).toBe(true);
    expect(map["sales.access"]).toBe(false);
  });

  it("filters nav access for members", () => {
    expect(
      hasStaffPermission({ "appointments.access": true }, "appointments.access", "MEMBER"),
    ).toBe(true);
    expect(
      hasStaffPermission({}, "contacts.access", "MEMBER"),
    ).toBe(false);
    expect(
      hasStaffPermission({}, "contacts.access", "ADMIN"),
    ).toBe(true);
  });

  it("limits settings sidebar for members to granted routes", () => {
    expect(
      canAccessSettingsHref("/business/settings/appearance", {
        businessRole: "MEMBER",
        staffPermissions: {},
      }),
    ).toBe(true);
    expect(
      canAccessSettingsHref("/business/settings/profile", {
        businessRole: "MEMBER",
        staffPermissions: {},
      }),
    ).toBe(false);
    expect(
      canAccessSettingsHref("/business/settings/team", {
        businessRole: "MEMBER",
        staffPermissions: { "settings.team.manage": true },
      }),
    ).toBe(true);
    expect(
      canAccessSettingsHref("/business/settings/profile", {
        businessRole: "ADMIN",
      }),
    ).toBe(true);
  });
});
