import { describe, expect, it } from "vitest";
import {
  isBillingRecoverySafeRoute,
  isBillingRecoveryState,
  isBillingRecoverySubscriptionStatus,
} from "./billing-recovery";
import type { BusinessTenantAccess } from "./types";

function buildAccess(
  overrides: Partial<BusinessTenantAccess> = {},
): BusinessTenantAccess {
  return {
    businessId: "biz-1",
    businessName: "Acme",
    businessStatus: "ACTIVE",
    canAccessWorkspace: false,
    reasonCode: "SUBSCRIPTION_CANCELED",
    reasonLabel: "Subscription is canceled.",
    warnings: [],
    needsAttention: [],
    effectiveCapabilities: [],
    subscription: {
      id: "sub-1",
      status: "CANCELED",
      paymentMethod: "NOT_SELECTED",
      paymentStatus: "NOT_REQUIRED",
      billingSource: "STRIPE",
    },
    ...overrides,
  };
}

describe("billing-recovery", () => {
  it("detects canceled subscription status as recovery", () => {
    expect(isBillingRecoverySubscriptionStatus("CANCELED")).toBe(true);
    expect(isBillingRecoverySubscriptionStatus("ACTIVE")).toBe(false);
  });

  it("treats active businesses with canceled subscriptions as recovery", () => {
    expect(isBillingRecoveryState(buildAccess())).toBe(true);
  });

  it("does not treat suspended businesses as billing recovery", () => {
    expect(
      isBillingRecoveryState(
        buildAccess({
          businessStatus: "SUSPENDED",
          reasonCode: "BUSINESS_SUSPENDED",
        }),
      ),
    ).toBe(false);
  });

  it("allows only billing routes during recovery", () => {
    expect(isBillingRecoverySafeRoute("/business/settings/billing")).toBe(true);
    expect(isBillingRecoverySafeRoute("/business/billing/history")).toBe(true);
    expect(isBillingRecoverySafeRoute("/business/contacts")).toBe(false);
    expect(isBillingRecoverySafeRoute("/business/settings/profile")).toBe(false);
  });
});
