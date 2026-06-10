"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { PublicPricing } from "@/features/platform/types/plan-group";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  designSettingsToCssVariables,
  gridColumnsClass,
  resolvePlanGroupDesignSettings,
} from "@/features/platform/utils/plan-design-settings.util";
import { PricingTierCard } from "./pricing-tier-card";

type PricingTablePreviewProps = {
  data: PublicPricing;
};

export function PricingTablePreview({ data }: PricingTablePreviewProps) {
  const settings = useMemo(
    () =>
      resolvePlanGroupDesignSettings(
        data.rawDesignSettings ?? data.designSettings,
        {
          theme: data.embed.theme,
          layout: data.embed.layout,
          showMonthlyYearlyToggle: data.embed.showMonthlyYearlyToggle,
          showFeatureComparison: data.embed.showFeatureComparison,
          showSetupFee: data.embed.showSetupFee,
          showTrialDays: data.embed.showTrialDays,
          showCapabilities: data.embed.showCapabilities,
          showTierFeatures: data.embed.showTierFeatures,
        },
      ),
    [data],
  );
  const defaultCycle = data.billingCycles.includes("MONTHLY")
    ? "MONTHLY"
    : (data.billingCycles[0] ?? "MONTHLY");
  const [cycle, setCycle] = useState<"MONTHLY" | "YEARLY">(
    defaultCycle === "YEARLY" ? "YEARLY" : "MONTHLY",
  );

  const rootStyle = useMemo(
    () => designSettingsToCssVariables(settings) as CSSProperties,
    [settings],
  );

  const showToggle =
    settings.showMonthlyYearlyToggle && data.billingCycles.length > 1;
  const isCompact = settings.layout === "compact";

  return (
    <div
      className="mx-auto max-w-6xl space-y-8 px-2 py-4"
      style={{
        ...rootStyle,
        background: "transparent",
        color: "var(--plan-section-text)",
        fontFamily: "var(--plan-font-family)",
        fontSize: "var(--plan-body-size)",
      }}
    >
      {settings.showPlanGroupTitle || settings.showPlanGroupDescription ? (
        <div className="space-y-3 text-center">
          {settings.showPlanGroupTitle ? (
            <h2
              className="font-bold tracking-tight"
              style={{ fontSize: "var(--plan-heading-size)" }}
            >
              {data.name}
            </h2>
          ) : null}
          {settings.showPlanGroupDescription && data.description ? (
            <p
              className="mx-auto max-w-2xl"
              style={{ color: "var(--plan-section-muted)" }}
            >
              {data.description}
            </p>
          ) : null}
        </div>
      ) : null}

      {showToggle ? (
        <div className="flex justify-center">
          <div
            className="inline-flex rounded-full border p-1"
            style={{
              borderColor: "var(--plan-card-border)",
              background:
                "color-mix(in srgb, var(--plan-section-muted) 12%, var(--plan-card-bg))",
            }}
          >
            {(["MONTHLY", "YEARLY"] as const).map((billingCycle) =>
              data.billingCycles.includes(billingCycle) ? (
                <Button
                  key={billingCycle}
                  type="button"
                  size="sm"
                  variant={cycle === billingCycle ? "default" : "ghost"}
                  className="rounded-full px-5"
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

      <div
        className={cn(
          "grid items-stretch",
          isCompact ? "gap-3" : "gap-5",
          gridColumnsClass(settings.columns, data.tiers.length),
        )}
      >
        {data.tiers.map((tier) => (
          <div key={tier.slug} className="h-full">
            <PricingTierCard
              tier={tier}
              settings={settings}
              currency={data.currency}
              cycle={cycle}
              compact={isCompact}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
