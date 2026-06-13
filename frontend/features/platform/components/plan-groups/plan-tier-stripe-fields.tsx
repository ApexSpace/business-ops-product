"use client";

import type { Control } from "react-hook-form";
import { TextField } from "@/components/forms/text-field";
import type { CreatePlanTierValues } from "@/features/platform/schemas/plan-group-form";

export type PlanTierStripeFormValues = {
  stripeProductId: string;
  stripeMonthlyPriceId: string;
  stripeYearlyPriceId: string;
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

export function stripeFormStripeToMetadata(
  stripe?: {
    productId?: string;
    monthlyPriceId?: string;
    yearlyPriceId?: string;
  } | null,
): Record<string, unknown> {
  return stripeFormValuesToMetadata({
    stripeProductId: stripe?.productId ?? "",
    stripeMonthlyPriceId: stripe?.monthlyPriceId ?? "",
    stripeYearlyPriceId: stripe?.yearlyPriceId ?? "",
  });
}

type PlanTierStripeFieldsProps = {
  control: Control<CreatePlanTierValues>;
  disabled?: boolean;
};

export function PlanTierStripeFields({
  control,
  disabled,
}: PlanTierStripeFieldsProps) {
  return (
    <div className="space-y-3 rounded-lg border border-dashed p-4">
      <div>
        <p className="text-sm font-medium">Stripe billing</p>
        <p className="text-xs text-muted-foreground">
          Map this tier to Stripe product and price IDs for platform subscription
          checkout. Leave blank for manual or internal plans.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-1">
        <TextField
          control={control}
          name="stripe.productId"
          label="Stripe product ID"
          disabled={disabled}
          placeholder="prod_..."
        />
        <TextField
          control={control}
          name="stripe.monthlyPriceId"
          label="Stripe monthly price ID"
          disabled={disabled}
          placeholder="price_..."
        />
        <TextField
          control={control}
          name="stripe.yearlyPriceId"
          label="Stripe yearly price ID"
          disabled={disabled}
          placeholder="price_..."
        />
      </div>
    </div>
  );
}
