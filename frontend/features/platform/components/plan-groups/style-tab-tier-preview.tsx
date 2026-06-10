"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type {
  PlanTier,
  PublicPricingTier,
} from "@/features/platform/types/plan-group";
import type { ResolvedPlanGroupDesignSettings } from "@/features/platform/types/plan-design-settings";
import { Button } from "@/components/ui/button";
import { designSettingsToCssVariables } from "@/features/platform/utils/plan-design-settings.util";
import { PricingTierCard } from "./pricing-tier-card";

const SAMPLE_TIER: PublicPricingTier = {
  slug: "sample",
  name: "Professional",
  description: "Everything you need to grow your business.",
  priceMonthly: "49",
  priceYearly: "490",
  setupFee: "99",
  trialDays: 14,
  badge: "Most Popular",
  highlighted: true,
  ctaLabel: "Get started",
  ctaUrl: "#",
  designSettings: null,
  capabilities: [
    { key: "api", name: "API Access" },
    { key: "support", name: "Priority Support" },
  ],
  features: [
    { label: "Unlimited projects", included: true },
    { label: "Advanced analytics", included: true },
    { label: "Custom domain", included: false },
  ],
};

function pickSampleTier(
  tiers: PlanTier[],
  defaultCtaLabel?: string | null,
  defaultCtaUrl?: string | null,
): PublicPricingTier {
  const tier =
    tiers.find((item) => item.highlighted) ??
    tiers.find((item) => item.status === "PUBLISHED") ??
    tiers[0];

  if (!tier) return SAMPLE_TIER;

  return {
    slug: tier.slug,
    name: tier.name,
    description: tier.description,
    priceMonthly: tier.priceMonthly,
    priceYearly: tier.priceYearly,
    setupFee: tier.setupFee,
    trialDays: tier.trialDays,
    badge: tier.badge,
    highlighted: tier.highlighted,
    ctaLabel: tier.ctaLabel ?? defaultCtaLabel ?? "Get started",
    ctaUrl: tier.ctaUrl ?? defaultCtaUrl ?? "#",
    designSettings: tier.designSettings,
    capabilities: tier.capabilities.map((capability) => ({
      key: capability.key,
      name: capability.name,
      description: capability.description,
    })),
    features: tier.features.map((feature) => ({
      label: feature.label,
      description: feature.description,
      included: feature.included,
      icon: feature.icon,
    })),
  };
}

type StyleTabTierPreviewProps = {
  designSettings: ResolvedPlanGroupDesignSettings;
  tiers: PlanTier[];
  currency: string;
  billingCycles: string[];
  defaultCtaLabel?: string | null;
  defaultCtaUrl?: string | null;
};

export function StyleTabTierPreview({
  designSettings,
  tiers,
  currency,
  billingCycles,
  defaultCtaLabel,
  defaultCtaUrl,
}: StyleTabTierPreviewProps) {
  const sampleTier = useMemo(
    () => pickSampleTier(tiers, defaultCtaLabel, defaultCtaUrl),
    [tiers, defaultCtaLabel, defaultCtaUrl],
  );

  const defaultCycle = billingCycles.includes("MONTHLY")
    ? "MONTHLY"
    : (billingCycles[0] ?? "MONTHLY");
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">(
    defaultCycle === "YEARLY" ? "YEARLY" : "MONTHLY",
  );

  const rootStyle = useMemo(
    () => designSettingsToCssVariables(designSettings) as CSSProperties,
    [designSettings],
  );

  const showToggle =
    designSettings.showMonthlyYearlyToggle && billingCycles.length > 1;
  const isCompact = designSettings.layout === "compact";

  return (
    <div className="rounded-lg border">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">Card preview</h2>
        <p className="text-xs text-muted-foreground">
          Updates instantly as you edit style settings.
        </p>
      </div>
      <div
        className="p-4"
        style={{
          ...rootStyle,
          background: "transparent",
          color: "var(--plan-section-text)",
          fontFamily: "var(--plan-font-family)",
          fontSize: "var(--plan-body-size)",
        }}
      >
        {showToggle ? (
          <div className="mb-4 flex justify-center">
            <div
              className="inline-flex rounded-full border p-1"
              style={{
                borderColor: "var(--plan-card-border)",
                background:
                  "color-mix(in srgb, var(--plan-section-muted) 12%, var(--plan-card-bg))",
              }}
            >
              {(["MONTHLY", "YEARLY"] as const).map((billingCycle) =>
                billingCycles.includes(billingCycle) ? (
                  <Button
                    key={billingCycle}
                    type="button"
                    size="sm"
                    variant={cycle === billingCycle ? "default" : "ghost"}
                    className="rounded-full px-4"
                    style={
                      cycle === billingCycle
                        ? {
                            background: "var(--plan-accent)",
                            color: "#fff",
                          }
                        : { color: "var(--plan-section-muted)" }
                    }
                    onClick={() => setCycle(billingCycle)}
                  >
                    {billingCycle === "MONTHLY" ? "Monthly" : "Yearly"}
                  </Button>
                ) : null,
              )}
            </div>
          </div>
        ) : null}

        <div className="h-full w-full">
          <PricingTierCard
            tier={sampleTier}
            settings={designSettings}
            currency={currency}
            cycle={cycle}
            compact={isCompact}
          />
        </div>
      </div>
    </div>
  );
}
