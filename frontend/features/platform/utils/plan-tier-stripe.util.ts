import type { PlanTier, PlanTierStripeMapping } from "@/features/platform/types/plan-group";

export function parsePlanTierStripe(
  metadata?: Record<string, unknown> | null,
  stripe?: PlanTierStripeMapping | null,
): PlanTierStripeMapping {
  if (stripe) {
    return {
      productId: stripe.productId ?? "",
      monthlyPriceId: stripe.monthlyPriceId ?? "",
      yearlyPriceId: stripe.yearlyPriceId ?? "",
    };
  }

  const root = metadata?.stripe;
  if (!root || typeof root !== "object" || Array.isArray(root)) {
    return { productId: "", monthlyPriceId: "", yearlyPriceId: "" };
  }

  const record = root as Record<string, unknown>;
  return {
    productId: typeof record.productId === "string" ? record.productId : "",
    monthlyPriceId:
      typeof record.monthlyPriceId === "string" ? record.monthlyPriceId : "",
    yearlyPriceId:
      typeof record.yearlyPriceId === "string" ? record.yearlyPriceId : "",
  };
}

export function tierStripeToFormValues(tier: PlanTier): PlanTierStripeMapping {
  return parsePlanTierStripe(tier.metadata, tier.stripe);
}

export function stripeFormToApiBody(
  stripe: PlanTierStripeMapping,
): PlanTierStripeMapping | undefined {
  const productId = stripe.productId.trim();
  const monthlyPriceId = stripe.monthlyPriceId.trim();
  const yearlyPriceId = stripe.yearlyPriceId.trim();

  if (!productId && !monthlyPriceId && !yearlyPriceId) {
    return {
      productId: "",
      monthlyPriceId: "",
      yearlyPriceId: "",
    };
  }

  return {
    productId,
    monthlyPriceId,
    yearlyPriceId,
  };
}

export function formatPlanTierStripeSummary(
  stripe: PlanTierStripeMapping,
): string {
  const parts: string[] = [];
  if (stripe.monthlyPriceId.trim()) parts.push("Monthly price mapped");
  if (stripe.yearlyPriceId.trim()) parts.push("Yearly price mapped");
  if (stripe.productId.trim()) parts.push("Product mapped");
  return parts.join(" · ") || "Stripe not configured";
}

export function isPlanTierStripeCheckoutReady(
  stripe: PlanTierStripeMapping,
  billingCycle: "MONTHLY" | "YEARLY",
): boolean {
  if (billingCycle === "MONTHLY") {
    return Boolean(stripe.monthlyPriceId.trim());
  }
  return Boolean(stripe.yearlyPriceId.trim());
}
