"use client";

import { Check, Circle, Plus, X } from "lucide-react";
import type { PublicPricingTier } from "@/features/platform/types/plan-group";
import type {
  PlanFeatureIconSize,
  PlanFeatureIconStyle,
  ResolvedPlanGroupDesignSettings,
} from "@/features/platform/types/plan-design-settings";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  cardWidthClass,
  featureIconSizeClasses,
  flexJustifyClass,
  resolveTierCardStyles,
  textAlignmentClass,
  tierStylesToCssVariables,
} from "@/features/platform/utils/plan-design-settings.util";
import {
  formatPlanPrice,
  planPricePeriodSuffix,
} from "@/features/platform/utils/plan-price.util";
import type { CSSProperties, ReactNode } from "react";

function tierBadge(
  tier: PublicPricingTier,
  showBadges: boolean,
): string | null {
  if (!showBadges) return null;
  if (tier.badge) return tier.badge;
  return null;
}

function FeatureIcon({
  style,
  included,
  color,
  backgroundColor,
  size,
}: {
  style: PlanFeatureIconStyle;
  included: boolean;
  color: string;
  backgroundColor: string;
  size: PlanFeatureIconSize;
}) {
  if (!included || style === "none") return null;
  const sizeClasses = featureIconSizeClasses(size);
  const iconClassName = cn(sizeClasses.icon, "shrink-0");
  const iconStyle = { color };
  let icon: ReactNode;
  if (style === "dot") {
    icon = (
      <Circle className={iconClassName} style={iconStyle} fill="currentColor" />
    );
  } else if (style === "plus") {
    icon = <Plus className={iconClassName} style={iconStyle} />;
  } else {
    icon = <Check className={iconClassName} style={iconStyle} />;
  }
  return (
    <span
      className={cn(
        "mt-0.5 flex shrink-0 items-center justify-center rounded-full",
        sizeClasses.container,
      )}
      style={{ backgroundColor, color }}
    >
      {icon}
    </span>
  );
}

export type PricingTierCardProps = {
  tier: PublicPricingTier;
  settings: ResolvedPlanGroupDesignSettings;
  currency: string;
  cycle: "MONTHLY" | "YEARLY";
  compact?: boolean;
  currentTierSlug?: string | null;
  interactive?: boolean;
  selectLabel?: string;
  isSelecting?: boolean;
  onSelect?: () => void;
};

export function PricingTierCard({
  tier,
  settings,
  currency,
  cycle,
  compact = false,
  currentTierSlug,
  interactive = false,
  selectLabel,
  isSelecting = false,
  onSelect,
}: PricingTierCardProps) {
  const isCurrentPlan = Boolean(
    currentTierSlug && tier.slug === currentTierSlug,
  );
  const badge = tierBadge(tier, settings.showBadges);
  const price = cycle === "YEARLY" ? tier.priceYearly : tier.priceMonthly;
  const tierStyles = resolveTierCardStyles(settings, tier.designSettings);
  const tierStyle = tierStylesToCssVariables(tierStyles) as CSSProperties;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col gap-[var(--plan-tier-gap,1.25em)] overflow-visible border p-6 transition-shadow",
        cardWidthClass(settings.cardWidth),
        compact && "p-4",
        (tier.highlighted || isCurrentPlan) && "ring-1",
      )}
      style={{
        ...tierStyle,
        maxWidth:
          settings.cardWidth === "auto"
            ? undefined
            : "var(--plan-card-max-width)",
        background: "var(--plan-tier-card-bg, var(--plan-card-bg))",
        color: "var(--plan-tier-card-text, var(--plan-card-text))",
        borderColor:
          tier.highlighted || isCurrentPlan
          ? "var(--plan-accent)"
          : "var(--plan-tier-card-border, var(--plan-card-border))",
        borderRadius: "var(--plan-tier-card-radius, var(--plan-card-radius))",
        boxShadow:
          tier.highlighted || isCurrentPlan
          ? "0 8px 24px color-mix(in srgb, var(--plan-accent) 20%, transparent), 0 0 0 1px var(--plan-accent)"
          : "var(--plan-tier-card-shadow, var(--plan-card-shadow))",
      }}
    >
      {isCurrentPlan ? (
        <Badge
          className="absolute -top-3 left-1/2 z-10 w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 uppercase tracking-wide"
          style={{
            background: "var(--plan-tier-badge-bg, var(--plan-accent))",
            color: "var(--plan-tier-badge-text, #fff)",
          }}
        >
          Current plan
        </Badge>
      ) : badge ? (
        <Badge
          className="w-fit uppercase tracking-wide"
          style={{
            background: "var(--plan-tier-badge-bg, var(--plan-accent))",
            color: "var(--plan-tier-badge-text, #fff)",
          }}
        >
          {badge}
        </Badge>
      ) : null}

      <h3
        className={cn(
          "text-xl",
          textAlignmentClass(settings.tierNameAlignment),
        )}
        style={{
          fontWeight: settings.tierNameBold ? 700 : 400,
          fontStyle: settings.tierNameItalic ? "italic" : "normal",
        }}
      >
        {tier.name}
      </h3>

      <div className="flex flex-col gap-[0.35em] leading-none">
        <div className={cn(textAlignmentClass(settings.priceAlignment))}>
          <div
            className="inline-flex flex-wrap items-baseline gap-0.5 text-4xl leading-none tracking-tight"
            style={{
              fontWeight: settings.priceBold ? 700 : 400,
              fontStyle: settings.priceItalic ? "italic" : "normal",
            }}
          >
            <span>{formatPlanPrice(price, currency)}</span>
            <span
              className="text-base font-normal leading-none"
              style={{ color: "var(--plan-section-muted)" }}
            >
              {planPricePeriodSuffix(cycle)}
            </span>
          </div>
        </div>

        {settings.showSetupFee && tier.setupFee ? (
          <p
            className={cn("text-sm", textAlignmentClass(settings.priceAlignment))}
            style={{ color: "var(--plan-section-muted)" }}
          >
            Setup fee: {formatPlanPrice(tier.setupFee, currency)}
          </p>
        ) : null}
        {settings.showTrialDays && tier.trialDays ? (
          <p
            className={cn("text-sm", textAlignmentClass(settings.priceAlignment))}
            style={{ color: "var(--plan-section-muted)" }}
          >
            {tier.trialDays}-day free trial
          </p>
        ) : null}
      </div>

      {settings.showDescriptions && tier.description ? (
        <p
          className={cn("text-sm", textAlignmentClass(settings.descriptionAlignment))}
          style={{
            color: "var(--plan-section-muted)",
            fontWeight: settings.descriptionBold ? 700 : 400,
            fontStyle: settings.descriptionItalic ? "italic" : "normal",
          }}
        >
          {tier.description}
        </p>
      ) : null}

      {settings.showTierFeatures && tier.features.length > 0 ? (
        <ul className="flex flex-1 flex-col gap-[var(--plan-feature-list-gap,0.5em)] text-sm">
          {tier.features.map((feature, index) => (
            <li
              key={`${tier.slug}-feature-${index}`}
              className={cn(
                "flex items-start gap-2",
                !feature.included && "line-through",
              )}
              style={{
                ...(!feature.included
                  ? { color: "var(--plan-section-muted)" }
                  : {}),
                fontWeight: tierStyles.featureListBold ? 700 : 400,
              }}
            >
              {feature.included ? (
                <FeatureIcon
                  style={tierStyles.featureIconStyle}
                  included={feature.included}
                  color="var(--plan-tier-feature-icon, var(--plan-feature-icon))"
                  backgroundColor="var(--plan-tier-feature-icon-bg, var(--plan-feature-icon-bg))"
                  size={tierStyles.featureIconSize}
                />
              ) : (
                <X
                  className="mt-0.5 size-4 shrink-0"
                  style={{ color: "var(--plan-section-muted)" }}
                />
              )}
              <span>{feature.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-1" />
      )}

      {settings.showCapabilities && tier.capabilities.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tier.capabilities.map((cap) => (
            <Badge
              key={cap.key}
              variant="secondary"
              className="text-xs"
              style={{
                background:
                  "color-mix(in srgb, var(--plan-accent) 15%, var(--plan-card-bg))",
                color: "var(--plan-accent)",
                borderColor:
                  "color-mix(in srgb, var(--plan-accent) 35%, transparent)",
              }}
            >
              {cap.name}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className={cn("flex", flexJustifyClass(settings.ctaAlignment))}>
        {interactive ? (
          <button
            type="button"
            disabled={isCurrentPlan || isSelecting}
            onClick={onSelect}
            className={cn(
              "inline-flex items-center justify-center px-4 py-2 text-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60",
              settings.ctaAlignment === "center" && "w-full",
              tierStyles.buttonStyle === "outline" && "border",
            )}
            style={{
              background: isCurrentPlan
                ? "color-mix(in srgb, var(--plan-accent) 12%, var(--plan-card-bg))"
                : tierStyles.buttonBackgroundColor,
              color: isCurrentPlan
                ? "var(--plan-accent)"
                : tierStyles.buttonTextColor,
              borderColor:
                tierStyles.buttonStyle === "outline" || isCurrentPlan
                  ? "var(--plan-accent)"
                  : tierStyles.buttonBackgroundColor,
              borderRadius: tierStyles.buttonBorderRadius,
              fontWeight: settings.ctaBold ? 700 : 400,
            }}
          >
            {isCurrentPlan
              ? "Current plan"
              : isSelecting
                ? "Updating…"
                : selectLabel || "Select plan"}
          </button>
        ) : (
          <a
            href={tier.ctaUrl?.trim() || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center justify-center px-4 py-2 text-sm transition-opacity hover:opacity-90",
              settings.ctaAlignment === "center" && "w-full",
              tierStyles.buttonStyle === "outline" && "border",
            )}
            style={{
              background: tierStyles.buttonBackgroundColor,
              color: tierStyles.buttonTextColor,
              borderColor:
                tierStyles.buttonStyle === "outline"
                  ? tierStyles.buttonTextColor
                  : tierStyles.buttonBackgroundColor,
              borderRadius: tierStyles.buttonBorderRadius,
              fontWeight: settings.ctaBold ? 700 : 400,
            }}
          >
            {tier.ctaLabel?.trim() || "Get started"}
          </a>
        )}
      </div>
    </div>
  );
}
