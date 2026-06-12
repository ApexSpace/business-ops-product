"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type {
  PublicPricing,
  PublicPricingTier,
} from "@/features/platform/types/plan-group";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  designSettingsToCssVariables,
  gridColumnsClass,
  resolvePlanGroupDesignSettings,
} from "@/features/platform/utils/plan-design-settings.util";
import { PricingTierCard } from "./pricing-tier-card";

export type PlanTierFilter = "all" | "higher" | "lower";

type PricingTablePreviewProps = {
  data: PublicPricing;
  currentTierSlug?: string | null;
  tierFilter?: PlanTierFilter;
  interactive?: boolean;
  selectingTierSlug?: string | null;
  onSelectTier?: (tier: PublicPricingTier) => void;
  /** Size the layout to the visible tier cards (e.g. inside a dialog). */
  fitContent?: boolean;
  /** Show plan group title and description above the tiers. */
  showGroupHeader?: boolean;
};

function tierSelectLabel(
  tierSlug: string,
  currentTierSlug: string | null | undefined,
  allTiers: PublicPricingTier[],
): string {
  if (!currentTierSlug) return "Select plan";

  const currentIndex = allTiers.findIndex((tier) => tier.slug === currentTierSlug);
  const tierIndex = allTiers.findIndex((tier) => tier.slug === tierSlug);
  if (currentIndex < 0 || tierIndex < 0) return "Select plan";
  if (tierIndex > currentIndex) return "Upgrade";
  if (tierIndex < currentIndex) return "Downgrade";
  return "Current plan";
}

function filterTiers(
  tiers: PublicPricingTier[],
  currentTierSlug: string | null | undefined,
  tierFilter: PlanTierFilter,
): PublicPricingTier[] {
  if (tierFilter === "all" || !currentTierSlug) {
    return tiers;
  }

  const currentIndex = tiers.findIndex((tier) => tier.slug === currentTierSlug);
  if (currentIndex < 0) return tiers;

  if (tierFilter === "higher") {
    return tiers.slice(currentIndex);
  }

  return tiers.slice(0, currentIndex + 1);
}

export function PricingTablePreview({
  data,
  currentTierSlug,
  tierFilter = "all",
  interactive = false,
  selectingTierSlug,
  onSelectTier,
  fitContent = false,
  showGroupHeader = true,
}: PricingTablePreviewProps) {
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
  const visibleTiers = useMemo(
    () => filterTiers(data.tiers, currentTierSlug, tierFilter),
    [currentTierSlug, data.tiers, tierFilter],
  );

  const tierGridStyle = fitContent
    ? ({
        gridTemplateColumns: `repeat(${Math.max(visibleTiers.length, 1)}, minmax(240px, 300px))`,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className={cn(
        "space-y-8 px-2 py-4",
        fitContent ? "w-fit" : "mx-auto max-w-6xl",
      )}
      style={{
        ...rootStyle,
        background: "transparent",
        color: "var(--plan-section-text)",
        fontFamily: "var(--plan-font-family)",
        fontSize: "var(--plan-body-size)",
      }}
    >
      {showGroupHeader &&
      (settings.showPlanGroupTitle || settings.showPlanGroupDescription) ? (
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
          fitContent
            ? "w-fit pt-3"
            : gridColumnsClass(settings.columns, visibleTiers.length || 1),
        )}
        style={tierGridStyle}
      >
        {visibleTiers.map((tier) => (
          <div key={tier.slug} className="h-full">
            <PricingTierCard
              tier={tier}
              settings={settings}
              currency={data.currency}
              cycle={cycle}
              compact={isCompact}
              currentTierSlug={currentTierSlug}
              interactive={interactive}
              isSelecting={selectingTierSlug === tier.slug}
              selectLabel={
                tierFilter === "all"
                  ? tierSelectLabel(tier.slug, currentTierSlug, data.tiers)
                  : tierFilter === "higher"
                    ? "Upgrade"
                    : "Downgrade"
              }
              onSelect={
                onSelectTier ? () => onSelectTier(tier) : undefined
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
