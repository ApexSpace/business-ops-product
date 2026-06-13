import {
  isPlanTierStripeCheckoutReady,
  parsePlanTierStripe,
  stripeFormToApiBody,
} from "./plan-tier-stripe.util";

describe("plan-tier-stripe.util", () => {
  it("parses stripe mapping from tier metadata", () => {
    expect(
      parsePlanTierStripe({
        stripe: {
          productId: "prod_1",
          monthlyPriceId: "price_m",
        },
      }),
    ).toEqual({
      productId: "prod_1",
      monthlyPriceId: "price_m",
      yearlyPriceId: "",
    });
  });

  it("builds api body with empty stripe to clear mapping", () => {
    expect(
      stripeFormToApiBody({
        productId: "",
        monthlyPriceId: "",
        yearlyPriceId: "",
      }),
    ).toEqual({
      productId: "",
      monthlyPriceId: "",
      yearlyPriceId: "",
    });
  });

  it("detects checkout readiness by billing cycle", () => {
    const stripe = {
      productId: "prod_1",
      monthlyPriceId: "price_m",
      yearlyPriceId: "",
    };
    expect(isPlanTierStripeCheckoutReady(stripe, "MONTHLY")).toBe(true);
    expect(isPlanTierStripeCheckoutReady(stripe, "YEARLY")).toBe(false);
  });
});
