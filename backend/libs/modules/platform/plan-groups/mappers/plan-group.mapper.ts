import {
  PlanEmbedSettings,
  PlanFeatureRow,
  PlanGroup,
  PlanTier,
  PlanTierCapability,
  PlanTierFeature,
  Capability,
} from '@prisma/client';
import {
  PlanEmbedSettingsDto,
  PlanFeatureRowDto,
  PlanGroupDetailDto,
  PlanGroupListItemDto,
  PlanTierDto,
  PlanTierFeatureDto,
  TierCapabilityDto,
} from '../dto';
import {
  parsePlanGroupDesignSettings,
  parsePlanTierDesignSettings,
} from '../utils/plan-design-settings.util';

type PlanGroupWithCounts = PlanGroup & {
  _count: { tiers: number; featureRows: number };
  snapshot?: { id: string; name: string } | null;
};

type TierCapabilityWithCap = PlanTierCapability & {
  capability: Pick<Capability, 'id' | 'key' | 'name' | 'description'>;
};

type PlanTierWithRelations = PlanTier & {
  capabilities: TierCapabilityWithCap[];
  features: PlanTierFeature[];
};

function decimalToString(
  value: { toString(): string } | null | undefined,
): string | null {
  return value != null ? value.toString() : null;
}

function parseBillingCycles(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  return ['MONTHLY', 'YEARLY'];
}

function parseMetadata(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseFeatureRowValues(
  value: unknown,
): Record<string, { included: boolean; text?: string }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, { included: boolean; text?: string }> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const obj = raw as { included?: unknown; text?: unknown };
      result[key] = {
        included: Boolean(obj.included),
        ...(typeof obj.text === 'string' ? { text: obj.text } : {}),
      };
    }
  }
  return result;
}

export function toPlanGroupListItem(
  group: PlanGroupWithCounts,
): PlanGroupListItemDto {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    currency: group.currency,
    status: group.status,
    updatedAt: group.updatedAt.toISOString(),
    publishedAt: group.publishedAt?.toISOString() ?? null,
    _count: {
      tiers: group._count.tiers,
      featureRows: group._count.featureRows,
    },
  };
}

export function toPlanGroupDetail(
  group: PlanGroupWithCounts,
  tiers: PlanTierWithRelations[] = [],
): PlanGroupDetailDto {
  return {
    ...toPlanGroupListItem(group),
    billingCycles: parseBillingCycles(group.billingCycles),
    defaultCtaLabel: group.defaultCtaLabel,
    defaultCtaUrl: group.defaultCtaUrl,
    metadata: parseMetadata(group.metadata),
    designSettings: parsePlanGroupDesignSettings(group.designSettings),
    snapshotId: group.snapshotId ?? null,
    snapshotName: group.snapshot?.name ?? null,
    createdAt: group.createdAt.toISOString(),
    tiers: tiers.map(toPlanTier),
  };
}

export function toTierCapability(
  assignment: TierCapabilityWithCap,
): TierCapabilityDto {
  return {
    id: assignment.capability.id,
    capabilityId: assignment.capability.id,
    key: assignment.capability.key,
    name: assignment.capability.name,
    description: assignment.capability.description,
    sortOrder: assignment.sortOrder,
  };
}

export function toPlanTierFeature(
  feature: PlanTierFeature,
): PlanTierFeatureDto {
  return {
    id: feature.id,
    label: feature.label,
    description: feature.description,
    included: feature.included,
    icon: feature.icon,
    sortOrder: feature.sortOrder,
  };
}

export function toPlanTier(tier: PlanTierWithRelations): PlanTierDto {
  return {
    id: tier.id,
    planGroupId: tier.planGroupId,
    slug: tier.slug,
    name: tier.name,
    description: tier.description,
    status: tier.status,
    priceMonthly: decimalToString(tier.priceMonthly),
    priceYearly: decimalToString(tier.priceYearly),
    setupFee: decimalToString(tier.setupFee),
    trialDays: tier.trialDays,
    badge: tier.badge,
    highlighted: tier.highlighted,
    ctaLabel: tier.ctaLabel,
    ctaUrl: tier.ctaUrl,
    sortOrder: tier.sortOrder,
    metadata: parseMetadata(tier.metadata),
    designSettings: parsePlanTierDesignSettings(tier.designSettings),
    capabilities: tier.capabilities.map(toTierCapability),
    features: tier.features.map(toPlanTierFeature),
    createdAt: tier.createdAt.toISOString(),
    updatedAt: tier.updatedAt.toISOString(),
  };
}

export function toPlanFeatureRow(row: PlanFeatureRow): PlanFeatureRowDto {
  return {
    id: row.id,
    planGroupId: row.planGroupId,
    label: row.label,
    tooltip: row.tooltip,
    values: parseFeatureRowValues(row.values),
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toPlanEmbedSettings(
  settings: PlanEmbedSettings,
): PlanEmbedSettingsDto {
  return {
    id: settings.id,
    planGroupId: settings.planGroupId,
    theme: settings.theme,
    layout: settings.layout,
    showMonthlyYearlyToggle: settings.showMonthlyYearlyToggle,
    showFeatureComparison: settings.showFeatureComparison,
    showSetupFee: settings.showSetupFee,
    showTrialDays: settings.showTrialDays,
    showCapabilities: settings.showCapabilities,
    showTierFeatures: settings.showTierFeatures,
    customCss: settings.customCss,
    updatedAt: settings.updatedAt.toISOString(),
  };
}
