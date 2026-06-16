import { describe, expect, it } from "vitest";
import type { PublicPricingTier } from "@/features/platform/types/plan-group";
import { isPublicTierStripeReady } from "@/features/platform/hooks/use-plan-tier-subscribe";

const tier = (overrides: Partial<PublicPricingTier> = {}): PublicPricingTier => ({
  slug: "pro",
  name: "Pro",
  highlighted: false,
  capabilities: [],
  features: [],
  ...overrides,
});

describe("isPublicTierStripeReady", () => {
  it("requires monthly price for monthly checkout", () => {
    expect(
      isPublicTierStripeReady(
        tier({ stripeMonthlyEnabled: true, stripeYearlyEnabled: false }),
        "MONTHLY",
      ),
    ).toBe(true);
    expect(
      isPublicTierStripeReady(
        tier({ stripeMonthlyEnabled: false, stripeYearlyEnabled: true }),
        "MONTHLY",
      ),
    ).toBe(false);
  });

  it("requires yearly price for yearly checkout", () => {
    expect(
      isPublicTierStripeReady(
        tier({ stripeMonthlyEnabled: false, stripeYearlyEnabled: true }),
        "YEARLY",
      ),
    ).toBe(true);
  });
});
