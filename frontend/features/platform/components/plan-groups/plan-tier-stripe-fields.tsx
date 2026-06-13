"use client";

export type PlanTierStripeFormValues = {
  stripeProductId: string;
  stripeMonthlyPriceId: string;
  stripeYearlyPriceId: string;
};

type PlanTierStripeFieldsProps = {
  values: PlanTierStripeFormValues;
  onChange: (field: keyof PlanTierStripeFormValues, value: string) => void;
  disabled?: boolean;
};

export function parseTierStripeFormValues(
  metadata?: Record<string, unknown> | null,
): PlanTierStripeFormValues {
  const stripe =
    metadata?.stripe &&
    typeof metadata.stripe === "object" &&
    !Array.isArray(metadata.stripe)
      ? (metadata.stripe as Record<string, unknown>)
      : null;

  return {
    stripeProductId:
      typeof stripe?.productId === "string" ? stripe.productId : "",
    stripeMonthlyPriceId:
      typeof stripe?.monthlyPriceId === "string" ? stripe.monthlyPriceId : "",
    stripeYearlyPriceId:
      typeof stripe?.yearlyPriceId === "string" ? stripe.yearlyPriceId : "",
  };
}

export function stripeFormValuesToMetadata(
  values: PlanTierStripeFormValues,
): Record<string, unknown> {
  const stripe: Record<string, string> = {};
  if (values.stripeProductId.trim()) {
    stripe.productId = values.stripeProductId.trim();
  }
  if (values.stripeMonthlyPriceId.trim()) {
    stripe.monthlyPriceId = values.stripeMonthlyPriceId.trim();
  }
  if (values.stripeYearlyPriceId.trim()) {
    stripe.yearlyPriceId = values.stripeYearlyPriceId.trim();
  }
  return Object.keys(stripe).length ? { stripe } : {};
}

export function PlanTierStripeFields({
  values,
  onChange,
  disabled,
}: PlanTierStripeFieldsProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Stripe billing</p>
        <p className="text-xs text-muted-foreground">
          Map this tier to Stripe product and price IDs for platform subscription
          checkout.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium">Stripe product ID</span>
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={values.stripeProductId}
            disabled={disabled}
            placeholder="prod_..."
            onChange={(event) =>
              onChange("stripeProductId", event.target.value)
            }
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Monthly price ID</span>
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={values.stripeMonthlyPriceId}
            disabled={disabled}
            placeholder="price_..."
            onChange={(event) =>
              onChange("stripeMonthlyPriceId", event.target.value)
            }
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Yearly price ID</span>
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={values.stripeYearlyPriceId}
            disabled={disabled}
            placeholder="price_..."
            onChange={(event) =>
              onChange("stripeYearlyPriceId", event.target.value)
            }
          />
        </label>
      </div>
    </div>
  );
}