export type PlanTierStripeMetadata = {
  productId?: string;
  monthlyPriceId?: string;
  yearlyPriceId?: string;
};

export type PlanTierStripeMapping = {
  productId?: string | null;
  monthlyPriceId?: string | null;
  yearlyPriceId?: string | null;
};

export type PlanTierStripeInput = {
  productId?: string | null;
  monthlyPriceId?: string | null;
  yearlyPriceId?: string | null;
};

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

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

export function parsePlanTierStripe(
  metadata: unknown,
): PlanTierStripeMapping | null {
  const root = parseRecord(metadata);
  const stripe = parseRecord(root?.stripe);
  if (!stripe) return null;

  const productId = trimOrNull(
    typeof stripe.productId === 'string' ? stripe.productId : null,
  );
  const monthlyPriceId = trimOrNull(
    typeof stripe.monthlyPriceId === 'string' ? stripe.monthlyPriceId : null,
  );
  const yearlyPriceId = trimOrNull(
    typeof stripe.yearlyPriceId === 'string' ? stripe.yearlyPriceId : null,
  );

  if (!productId && !monthlyPriceId && !yearlyPriceId) {
    return null;
  }

  return { productId, monthlyPriceId, yearlyPriceId };
}

export function normalizePlanTierStripeInput(
  input: PlanTierStripeInput | null | undefined,
): PlanTierStripeMapping | null {
  if (input == null) return null;

  const productId = trimOrNull(input.productId ?? null);
  const monthlyPriceId = trimOrNull(input.monthlyPriceId ?? null);
  const yearlyPriceId = trimOrNull(input.yearlyPriceId ?? null);

  if (!productId && !monthlyPriceId && !yearlyPriceId) {
    return null;
  }

  return { productId, monthlyPriceId, yearlyPriceId };
}

export function mergePlanTierStripeIntoMetadata(
  metadata: unknown,
  stripeInput: PlanTierStripeInput | null | undefined,
): Record<string, unknown> {
  const base = { ...(parseRecord(metadata) ?? {}) };
  const stripe = normalizePlanTierStripeInput(stripeInput);

  if (!stripe) {
    if ('stripe' in base) {
      delete base.stripe;
    }
    return base;
  }

  return {
    ...base,
    stripe: {
      ...(productIdOrUndefined(stripe.productId) !== undefined
        ? { productId: stripe.productId }
        : {}),
      ...(productIdOrUndefined(stripe.monthlyPriceId) !== undefined
        ? { monthlyPriceId: stripe.monthlyPriceId }
        : {}),
      ...(productIdOrUndefined(stripe.yearlyPriceId) !== undefined
        ? { yearlyPriceId: stripe.yearlyPriceId }
        : {}),
    },
  };
}

function productIdOrUndefined(
  value: string | null | undefined,
): string | undefined {
  return value ?? undefined;
}

export function resolvePlanTierMetadata(
  params: {
    metadata?: Record<string, unknown> | null;
    stripe?: PlanTierStripeInput | null;
  },
  existingMetadata?: unknown,
): Record<string, unknown> | undefined {
  if (params.metadata === undefined && params.stripe === undefined) {
    return undefined;
  }

  let merged = { ...(parseRecord(existingMetadata) ?? {}) };

  if (params.metadata !== undefined) {
    merged = {
      ...merged,
      ...(params.metadata ?? {}),
    };
  }

  if (params.stripe !== undefined) {
    merged = mergePlanTierStripeIntoMetadata(merged, params.stripe);
  }

  return merged;
}
