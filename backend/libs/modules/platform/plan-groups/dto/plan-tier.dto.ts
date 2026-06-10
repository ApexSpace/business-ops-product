import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanTierStatus } from '@prisma/client';
import type { PlanTierDesignSettings } from '../types/plan-design-settings.types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class TierFeatureInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsBoolean()
  included!: boolean;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class PlanTierFeatureDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  included!: boolean;

  @ApiPropertyOptional()
  icon?: string | null;

  @ApiProperty()
  sortOrder!: number;
}

export class CreatePlanTierDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase hyphenated' })
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: PlanTierStatus })
  @IsOptional()
  @IsEnum(PlanTierStatus)
  status?: PlanTierStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMonthly?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceYearly?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  setupFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  trialDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  highlighted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ctaLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ctaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  designSettings?: PlanTierDesignSettings;

  @ApiPropertyOptional({ type: [TierFeatureInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TierFeatureInputDto)
  features?: TierFeatureInputDto[];
}

export class UpdatePlanTierDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMonthly?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceYearly?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  setupFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  trialDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  highlighted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ctaLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ctaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  designSettings?: PlanTierDesignSettings;

  @ApiPropertyOptional({ type: [TierFeatureInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TierFeatureInputDto)
  features?: TierFeatureInputDto[];
}

export class AssignTierCapabilitiesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  capabilityIds!: string[];
}

export class ReorderTierCapabilitiesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  capabilityIds!: string[];
}

export class TierCapabilityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  capabilityId!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  sortOrder!: number;
}

export class PlanTierDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  planGroupId!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ enum: PlanTierStatus })
  status!: PlanTierStatus;

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

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  designSettings?: PlanTierDesignSettings | null;

  @ApiProperty({ type: [TierCapabilityDto] })
  capabilities!: TierCapabilityDto[];

  @ApiProperty({ type: [PlanTierFeatureDto] })
  features!: PlanTierFeatureDto[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
