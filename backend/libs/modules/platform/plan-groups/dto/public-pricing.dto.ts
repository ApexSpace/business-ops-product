import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanEmbedLayout, PlanEmbedTheme } from '@prisma/client';
import type {
  PlanGroupDesignSettings,
  PlanTierDesignSettings,
  ResolvedPlanGroupDesignSettings,
} from '../types/plan-design-settings.types';

export class PublicPricingEmbedDto {
  @ApiProperty({ enum: PlanEmbedTheme })
  theme!: PlanEmbedTheme;

  @ApiProperty({ enum: PlanEmbedLayout })
  layout!: PlanEmbedLayout;

  @ApiProperty()
  showMonthlyYearlyToggle!: boolean;

  @ApiProperty()
  showFeatureComparison!: boolean;

  @ApiProperty()
  showSetupFee!: boolean;

  @ApiProperty()
  showTrialDays!: boolean;

  @ApiProperty()
  showCapabilities!: boolean;

  @ApiProperty()
  showTierFeatures!: boolean;
}

export class PublicPricingTierFeatureDto {
  @ApiProperty()
  label!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  included!: boolean;

  @ApiPropertyOptional()
  icon?: string | null;
}

export class PublicPricingCapabilityDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;
}

export class PublicPricingTierDto {
  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  priceMonthly?: string | null;

  @ApiPropertyOptional()
  priceYearly?: string | null;

  @ApiPropertyOptional()
  setupFee?: string | null;

  @ApiPropertyOptional()
  trialDays?: number | null;

  @ApiPropertyOptional()
  badge?: string | null;

  @ApiProperty()
  highlighted!: boolean;

  @ApiPropertyOptional()
  ctaLabel?: string | null;

  @ApiPropertyOptional()
  ctaUrl?: string | null;

  @ApiProperty({ type: [PublicPricingCapabilityDto] })
  capabilities!: PublicPricingCapabilityDto[];

  @ApiProperty({ type: [PublicPricingTierFeatureDto] })
  features!: PublicPricingTierFeatureDto[];

  @ApiPropertyOptional()
  designSettings?: PlanTierDesignSettings | null;
}

export class PublicPricingFeatureRowValueDto {
  @ApiProperty()
  included!: boolean;

  @ApiPropertyOptional()
  text?: string;
}

export class PublicPricingFeatureRowDto {
  @ApiProperty()
  label!: string;

  @ApiPropertyOptional()
  tooltip?: string | null;

  @ApiProperty()
  values!: Record<string, PublicPricingFeatureRowValueDto>;
}

export class PublicPricingDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ type: [String] })
  billingCycles!: string[];

  @ApiProperty({ type: PublicPricingEmbedDto })
  embed!: PublicPricingEmbedDto;

  @ApiProperty()
  designSettings!: ResolvedPlanGroupDesignSettings;

  @ApiPropertyOptional()
  rawDesignSettings?: PlanGroupDesignSettings | null;

  @ApiProperty({ type: [PublicPricingTierDto] })
  tiers!: PublicPricingTierDto[];

  @ApiProperty({ type: [PublicPricingFeatureRowDto] })
  featureRows!: PublicPricingFeatureRowDto[];
}
