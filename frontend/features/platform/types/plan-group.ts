import type {
  PlanGroupDesignSettings,
  PlanTierDesignSettings,
  ResolvedPlanGroupDesignSettings,
} from "./plan-design-settings";

export type PlanGroupStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type PlanTierStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type PlanEmbedTheme = "LIGHT" | "DARK" | "AUTO";
export type PlanEmbedLayout = "CARDS" | "COMPARISON";

export type PlanGroupCounts = {
  tiers: number;
  featureRows: number;
};

export type PlanGroupListItem = {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  status: PlanGroupStatus;
  updatedAt: string;
  publishedAt?: string | null;
  _count: PlanGroupCounts;
};

export type { PlanGroupDesignSettings, PlanTierDesignSettings, ResolvedPlanGroupDesignSettings };

export type PlanGroupDetail = PlanGroupListItem & {
  billingCycles: string[];
  defaultCtaLabel?: string | null;
  defaultCtaUrl?: string | null;
  snapshotId?: string | null;
  snapshotName?: string | null;
  metadata?: Record<string, unknown> | null;
  designSettings?: PlanGroupDesignSettings | null;
  createdAt: string;
  tiers: PlanTier[];
};

export type PlanGroupStats = {
  total: number;
  published: number;
  draft: number;
  archived: number;
};

export type TierCapability = {
  id: string;
  capabilityId?: string;
  key: string;
  name: string;
  description?: string | null;
  sortOrder: number;
};

export type PlanTierFeature = {
  id: string;
  label: string;
  description?: string | null;
  included: boolean;
  icon?: string | null;
  sortOrder: number;
};

export type TierFeatureInput = {
  id?: string;
  label: string;
  description?: string;
  included: boolean;
  sortOrder: number;
};

export type PlanTier = {
  id: string;
  planGroupId: string;
  slug: string;
  name: string;
  description?: string | null;
  status: PlanTierStatus;
  priceMonthly?: string | null;
  priceYearly?: string | null;
  setupFee?: string | null;
  trialDays?: number | null;
  badge?: string | null;
  highlighted: boolean;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  sortOrder: number;
  metadata?: Record<string, unknown> | null;
  designSettings?: PlanTierDesignSettings | null;
  capabilities: TierCapability[];
  features: PlanTierFeature[];
  createdAt: string;
  updatedAt: string;
};

export type FeatureRowTierValue = {
  included: boolean;
  text?: string;
};

export type PlanFeatureRow = {
  id: string;
  planGroupId: string;
  label: string;
  tooltip?: string | null;
  values: Record<string, FeatureRowTierValue>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PlanEmbedSettings = {
  id: string;
  planGroupId: string;
  theme: PlanEmbedTheme;
  layout: PlanEmbedLayout;
  showMonthlyYearlyToggle: boolean;
  showFeatureComparison: boolean;
  showSetupFee: boolean;
  showTrialDays: boolean;
  showCapabilities: boolean;
  showTierFeatures: boolean;
  customCss?: string | null;
  updatedAt: string;
};

export type PublicPricingTierFeature = {
  label: string;
  description?: string | null;
  included: boolean;
  icon?: string | null;
};

export type PublicPricingCapability = {
  key: string;
  name: string;
  description?: string | null;
};

export type PublicPricingTier = {
  slug: string;
  name: string;
  description?: string | null;
  priceMonthly?: string | null;
  priceYearly?: string | null;
  setupFee?: string | null;
  trialDays?: number | null;
  badge?: string | null;
  highlighted: boolean;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  designSettings?: PlanTierDesignSettings | null;
  capabilities: PublicPricingCapability[];
  features: PublicPricingTierFeature[];
};

export type PublicPricingFeatureRow = {
  label: string;
  tooltip?: string | null;
  values: Record<string, FeatureRowTierValue>;
};

export type PublicPricing = {
  id: string;
  name: string;
  description?: string | null;
  currency: string;
  billingCycles: string[];
  embed: {
    theme: PlanEmbedTheme;
    layout: PlanEmbedLayout;
    showMonthlyYearlyToggle: boolean;
    showFeatureComparison: boolean;
    showSetupFee: boolean;
    showTrialDays: boolean;
    showCapabilities: boolean;
    showTierFeatures: boolean;
  };
  designSettings: ResolvedPlanGroupDesignSettings;
  rawDesignSettings?: PlanGroupDesignSettings | null;
  tiers: PublicPricingTier[];
  featureRows: PublicPricingFeatureRow[];
};
