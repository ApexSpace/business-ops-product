import { describe, expect, it } from "vitest";
import {
  canAccessSettingsHref,
  canViewAllStaffCalendars,
  hasStaffPermission,
  normalizeStaffPermissions,
} from "@/features/team/permissions/staff-permission-registry";

describe("staff permission helpers", () => {
  it("normalizes permission map", () => {
    const map = normalizeStaffPermissions({ "contacts.access": true });
    expect(map["contacts.access"]).toBe(true);
    expect(map["contacts.view_last_names"]).toBe(true);
    expect(map["contacts.view_contact_details"]).toBe(true);
    expect(map["sales.access"]).toBe(false);
  });

  it("migrates manage into delete_merge when unset", () => {
    const map = normalizeStaffPermissions({ "contacts.manage": true });
    expect(map["contacts.manage"]).toBe(true);
    expect(map["contacts.delete_merge"]).toBe(true);
  });

  it("does not override explicitly false contact privacy keys", () => {
    const map = normalizeStaffPermissions({
      "contacts.access": true,
      "contacts.view_last_names": false,
      "contacts.view_contact_details": false,
    });
    expect(map["contacts.view_last_names"]).toBe(false);
    expect(map["contacts.view_contact_details"]).toBe(false);
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

  it("lets manage_all imply viewing all calendars", () => {
    expect(
      canViewAllStaffCalendars(
        { "appointments.manage_all": true },
        "MEMBER",
      ),
    ).toBe(false);
    expect(
      canViewAllStaffCalendars(
        { "appointments.view_all_calendars": true },
        "MEMBER",
      ),
    ).toBe(true);
    expect(canViewAllStaffCalendars({}, "MEMBER")).toBe(false);
  });
});
