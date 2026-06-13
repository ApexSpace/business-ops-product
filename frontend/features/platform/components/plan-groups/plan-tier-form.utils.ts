import {
  parseOptionalDecimal,
  parseOptionalInt,
  type CreatePlanTierValues,
} from "@/features/platform/schemas/plan-group-form";
import type {
  PlanTier,
  PublicPricingCapability,
  PublicPricingTier,
  TierFeatureInput,
} from "@/features/platform/types/plan-group";
import type { PlanTierDesignSettings } from "@/features/platform/types/plan-design-settings";
import {
  isEmptyTierDesignSettings,
  stripEmptyDesignSettings,
} from "@/features/platform/utils/plan-design-settings.util";

type PreviewCapabilitySource = {
  id?: string;
  capabilityId?: string;
  key?: string;
  name?: string;
};

export function resolveTierCapabilityId(cap: {
  id?: string;
  capabilityId?: string;
}): string {
  return cap.capabilityId ?? cap.id ?? "";
}

type BuildPreviewTierOptions = {
  slug?: string;
  defaultCtaLabel?: string | null;
  defaultCtaUrl?: string | null;
  capabilities?: PublicPricingCapability[];
};

export const emptyTierValues: CreatePlanTierValues = {
  name: "",
  description: "",
  priceMonthly: "",
  priceYearly: "",
  setupFee: "",
  trialDays: "",
  badge: "",
  highlighted: false,
  ctaLabel: "",
  ctaUrl: "",
};

export function tierToFormValues(tier: PlanTier): CreatePlanTierValues {
  return {
    name: tier.name,
    description: tier.description ?? "",
    priceMonthly: tier.priceMonthly ?? "",
    priceYearly: tier.priceYearly ?? "",
    setupFee: tier.setupFee ?? "",
    trialDays: tier.trialDays != null ? String(tier.trialDays) : "",
    badge: tier.badge ?? "",
    highlighted: tier.highlighted,
    ctaLabel: tier.ctaLabel ?? "",
    ctaUrl: tier.ctaUrl ?? "",
  };
}

export function tierToFeatureInputs(tier: PlanTier): TierFeatureInput[] {
  return (tier.features ?? []).map((feature) => ({
    id: feature.id,
    label: feature.label,
    description: feature.description ?? undefined,
    included: feature.included,
    sortOrder: feature.sortOrder,
  }));
}

export function valuesToTierBody(
  values: CreatePlanTierValues,
  features?: TierFeatureInput[],
  designSettings?: PlanTierDesignSettings,
  metadata?: Record<string, unknown>,
) {
  const cleanedDesignSettings = designSettings
    ? stripEmptyDesignSettings(designSettings)
    : undefined;

  return {
    name: values.name,
    description: values.description || undefined,
    priceMonthly: parseOptionalDecimal(values.priceMonthly),
    priceYearly: parseOptionalDecimal(values.priceYearly),
    setupFee: parseOptionalDecimal(values.setupFee),
    trialDays: parseOptionalInt(values.trialDays),
    badge: values.badge || undefined,
    highlighted: values.highlighted ?? false,
    ctaLabel: values.ctaLabel || undefined,
    ctaUrl: values.ctaUrl || undefined,
    ...(metadata && Object.keys(metadata).length ? { metadata } : {}),
    ...(features !== undefined
      ? {
          features: features.map((feature, index) => ({
            ...(feature.id ? { id: feature.id } : {}),
            label: feature.label.trim(),
            description: feature.description?.trim() || undefined,
            included: feature.included,
            sortOrder: index,
          })),
        }
      : {}),
    ...(designSettings !== undefined
      ? {
          designSettings: isEmptyTierDesignSettings(cleanedDesignSettings)
            ? {}
            : cleanedDesignSettings,
        }
      : {}),
  };
}

export function formatTierPriceSummary(tier: PlanTier): string {
  const parts: string[] = [];
  if (tier.priceMonthly) parts.push(`${tier.priceMonthly}/mo`);
  if (tier.priceYearly) parts.push(`${tier.priceYearly}/yr`);
  return parts.join(" · ") || "No price set";
}

function previewCapabilitiesFromSources(
  sources: PreviewCapabilitySource[],
): PublicPricingCapability[] {
  return sources.map((cap) => {
    const id = resolveTierCapabilityId(cap);
    return {
      key: cap.key?.trim() || id,
      name: cap.name?.trim() || "Capability",
    };
  });
}

export function buildPreviewTier(
  values: CreatePlanTierValues,
  features: TierFeatureInput[],
  capabilitySources: PreviewCapabilitySource[],
  tierDesignSettings: PlanTierDesignSettings,
  options: BuildPreviewTierOptions = {},
): PublicPricingTier {
  const cleanedDesignSettings = stripEmptyDesignSettings(tierDesignSettings);

  return {
    slug: options.slug ?? "preview",
    name: values.name.trim() || "Tier name",
    description: values.description?.trim() || null,
    priceMonthly: values.priceMonthly?.trim() || null,
    priceYearly: values.priceYearly?.trim() || null,
    setupFee: values.setupFee?.trim() || null,
    trialDays: parseOptionalInt(values.trialDays) ?? null,
    badge: values.badge?.trim() || null,
    highlighted: values.highlighted ?? false,
    ctaLabel:
      values.ctaLabel?.trim() ||
      options.defaultCtaLabel?.trim() ||
      "Get started",
    ctaUrl: values.ctaUrl?.trim() || options.defaultCtaUrl?.trim() || "#",
    designSettings: isEmptyTierDesignSettings(cleanedDesignSettings)
      ? null
      : cleanedDesignSettings,
    capabilities:
      options.capabilities ??
      previewCapabilitiesFromSources(capabilitySources),
    features: features
      .filter((feature) => feature.label.trim())
      .map((feature) => ({
        label: feature.label.trim(),
        description: feature.description?.trim() || null,
        included: feature.included,
      })),
  };
}
