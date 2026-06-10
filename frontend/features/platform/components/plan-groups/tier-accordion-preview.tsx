"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { PublicPricingTier } from "@/features/platform/types/plan-group";
import type { ResolvedPlanGroupDesignSettings } from "@/features/platform/types/plan-design-settings";
import { Button } from "@/components/ui/button";
import { designSettingsToCssVariables } from "@/features/platform/utils/plan-design-settings.util";
import { PricingTierCard } from "./pricing-tier-card";

type TierAccordionPreviewProps = {
  tier: PublicPricingTier;
  designSettings: ResolvedPlanGroupDesignSettings;
  currency: string;
  billingCycles: string[];
};

export function TierAccordionPreview({
  tier,
  designSettings,
  currency,
  billingCycles,
}: TierAccordionPreviewProps) {
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
          Updates instantly as you edit this tier.
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
            tier={tier}
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
