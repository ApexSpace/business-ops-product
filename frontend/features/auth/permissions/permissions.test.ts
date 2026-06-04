import { describe, expect, it } from "vitest";
import { evaluatePermission, PERMISSIONS } from "./permissions";

describe("evaluatePermission", () => {
  it("allows business contact actions in business context", () => {
    expect(
      evaluatePermission(PERMISSIONS["contacts.create"], {
        sub: "u1",
        email: "a@b.com",
        context: "business",
        businessId: "b1",
        businessRole: "MEMBER",
      }),
    ).toBe(true);
  });

  it("denies platform billing for support role", () => {
    expect(
      evaluatePermission(PERMISSIONS["platform.billing.manage"], {
        sub: "u1",
        email: "a@b.com",
        context: "platform",
        platformRole: "SUPPORT",
      }),
    ).toBe(false);
  });
});
