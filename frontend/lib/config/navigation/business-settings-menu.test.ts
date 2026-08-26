import { describe, expect, it } from "vitest";
import {
  businessSettingsNavItems,
  isBusinessSettingsPath,
  isMigratedSettingsAppPath,
} from "./business-settings-menu";

describe("migrated settings app paths", () => {
  it("treats catalog Apps still hosted under settings as migrated", () => {
    expect(isMigratedSettingsAppPath("/business/settings/services")).toBe(true);
    expect(isMigratedSettingsAppPath("/business/settings/team/123")).toBe(true);
    expect(isMigratedSettingsAppPath("/business/settings/forms/new")).toBe(true);
    expect(
      isMigratedSettingsAppPath("/business/settings/automation-workflows/new"),
    ).toBe(true);
  });

  it("keeps remaining Settings pages out of the migrated set", () => {
    expect(isMigratedSettingsAppPath("/business/settings")).toBe(false);
    expect(isMigratedSettingsAppPath("/business/settings/profile")).toBe(false);
    expect(isMigratedSettingsAppPath("/business/settings/appearance")).toBe(
      false,
    );
    expect(isMigratedSettingsAppPath("/business/settings/calendars")).toBe(
      false,
    );
  });

  it("does not treat migrated Apps as Settings chrome paths", () => {
    expect(isBusinessSettingsPath("/business/settings/services")).toBe(false);
    expect(isBusinessSettingsPath("/business/settings/integrations")).toBe(
      false,
    );
    expect(isBusinessSettingsPath("/business/settings")).toBe(true);
    expect(isBusinessSettingsPath("/business/settings/profile")).toBe(true);
    expect(isBusinessSettingsPath("/business/settings/templates")).toBe(true);
  });

  it("promotes existing profile sections into the settings sidebar", () => {
    const hrefs = businessSettingsNavItems.map((entry) => entry.href);
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/business/settings/profile",
        "/business/settings/profile?tab=contact",
        "/business/settings/profile?tab=address",
        "/business/settings/profile?tab=regional",
        "/business/settings/profile?tab=hours",
        "/business/settings/appearance",
        "/business/settings/data",
      ]),
    );
    expect(hrefs).not.toContain("/business/settings/payroll");
  });
});
