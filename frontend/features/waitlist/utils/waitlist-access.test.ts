import { describe, expect, it } from "vitest";
import { canShowWaitlistChrome } from "./waitlist-access";

describe("canShowWaitlistChrome", () => {
  it("hides waitlist when the plan lacks appointments.waitlist", () => {
    expect(
      canShowWaitlistChrome({
        hasWaitlistCapability: false,
        canManageWaitlist: true,
      }),
    ).toBe(false);
  });

  it("hides waitlist when staff cannot manage_waitlist", () => {
    expect(
      canShowWaitlistChrome({
        hasWaitlistCapability: true,
        canManageWaitlist: false,
      }),
    ).toBe(false);
  });

  it("shows waitlist when entitlement and manage_waitlist are both granted", () => {
    expect(
      canShowWaitlistChrome({
        hasWaitlistCapability: true,
        canManageWaitlist: true,
      }),
    ).toBe(true);
  });
});
