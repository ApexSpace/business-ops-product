export type PlanTierStripeMetadata = {
  productId?: string;
  monthlyPriceId?: string;
  yearlyPriceId?: string;
};

export function parsePlanTierStripeMetadata(
  metadata: unknown,
): PlanTierStripeMetadata | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const root = metadata as Record<string, unknown>;
  const stripe =
    root.stripe && typeof root.stripe === 'object' && !Array.isArray(root.stripe)
      ? (root.stripe as Record<string, unknown>)
      : null;
  if (!stripe) return null;

  return {
    productId:
      typeof stripe.productId === 'string' ? stripe.productId : undefined,
    monthlyPriceId:
      typeof stripe.monthlyPriceId === 'string'
        ? stripe.monthlyPriceId
        : undefined,
    yearlyPriceId:
      typeof stripe.yearlyPriceId === 'string'
        ? stripe.yearlyPriceId
        : undefined,
  };
}

export function tierHasStripePrice(metadata: unknown): boolean {
  const stripe = parsePlanTierStripeMetadata(metadata);
  return Boolean(
    stripe?.monthlyPriceId?.trim() || stripe?.yearlyPriceId?.trim(),
  );
}
