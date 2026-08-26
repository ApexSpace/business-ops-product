import { describe, expect, it } from "vitest";
import { isSettingsNavItemActive } from "./settings-nav-active";

const profile = { href: "/business/settings/profile" };
const contact = { href: "/business/settings/profile?tab=contact" };
const hours = { href: "/business/settings/profile?tab=hours" };
const appearance = { href: "/business/settings/appearance" };

describe("isSettingsNavItemActive", () => {
  it("treats a missing profile tab as Business Details", () => {
    expect(
      isSettingsNavItemActive("/business/settings/profile", "", profile),
    ).toBe(true);
    expect(
      isSettingsNavItemActive("/business/settings/profile", "", contact),
    ).toBe(false);
  });

  it("treats an explicit business tab as Business Details", () => {
    expect(
      isSettingsNavItemActive(
        "/business/settings/profile",
        "tab=business",
        profile,
      ),
    ).toBe(true);
    expect(
      isSettingsNavItemActive(
        "/business/settings/profile",
        "tab=business",
        contact,
      ),
    ).toBe(false);
  });

  it("matches profile items by tab query", () => {
    expect(
      isSettingsNavItemActive(
        "/business/settings/profile",
        "tab=contact",
        contact,
      ),
    ).toBe(true);
    expect(
      isSettingsNavItemActive(
        "/business/settings/profile",
        "tab=hours",
        hours,
      ),
    ).toBe(true);
    expect(
      isSettingsNavItemActive(
        "/business/settings/profile",
        "tab=hours",
        profile,
      ),
    ).toBe(false);
  });

  it("does not mark items active on the settings index", () => {
    expect(isSettingsNavItemActive("/business/settings", "", profile)).toBe(
      false,
    );
  });

  it("uses pathname matching for non-profile settings", () => {
    expect(
      isSettingsNavItemActive(
        "/business/settings/appearance",
        "",
        appearance,
      ),
    ).toBe(true);
    expect(
      isSettingsNavItemActive("/business/settings/appearance", "", profile),
    ).toBe(false);
  });
});
