import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ArrayMinSize,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddonPurchaseMode, AddonStatus } from '@prisma/client';

export class CreateAddonDto {
  @ApiPropertyOptional({
    description:
      'Stable identifier. Optional — auto-generated from name when omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  key?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ enum: AddonPurchaseMode })
  @IsEnum(AddonPurchaseMode)
  purchaseMode!: AddonPurchaseMode;

  @ApiPropertyOptional({ enum: AddonStatus })
  @IsOptional()
  @IsEnum(AddonStatus)
  status?: AddonStatus;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Required when purchaseMode = INDEPENDENT',
  })
  @ValidateIf((o: CreateAddonDto) => o.purchaseMode === AddonPurchaseMode.INDEPENDENT)
  @IsNumber()
  @Min(0)
  priceMonthly?: number;

  @ApiPropertyOptional()
  @ValidateIf((o: CreateAddonDto) => o.purchaseMode === AddonPurchaseMode.INDEPENDENT)
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceYearly?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  staffLimitDelta?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  locationLimitDelta?: number;

  @ApiProperty()
  @IsUUID()
  capabilityId!: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Required (≥1) when purchaseMode = DEPENDENT',
  })
  @ValidateIf((o: CreateAddonDto) => o.purchaseMode === AddonPurchaseMode.DEPENDENT)
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  tierIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Optional tiers that include this independent add-on',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  includeInTierIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateAddonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: AddonPurchaseMode })
  @IsOptional()
  @IsEnum(AddonPurchaseMode)
  purchaseMode?: AddonPurchaseMode;

  @ApiPropertyOptional({ enum: AddonStatus })
  @IsOptional()
  @IsEnum(AddonStatus)
  status?: AddonStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMonthly?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceYearly?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  staffLimitDelta?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  locationLimitDelta?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  capabilityId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tierIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  includeInTierIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Required when flipping INDEPENDENT→DEPENDENT with active purchases',
  })
  @IsOptional()
  @IsBoolean()
  confirmModeFlip?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  modeFlipReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    enum: ['keep_grandfathered', 'force_remove', 'convert_to_purchased'],
    description:
      'How to treat businesses that currently have this add-on INCLUDED when catalog links shrink',
  })
  @IsOptional()
  @IsIn(['keep_grandfathered', 'force_remove', 'convert_to_purchased'])
  subscriberPolicy?: AddonSubscriberPolicy;

  @ApiPropertyOptional({
    description: 'Email affected owners about the packaging change',
  })
  @IsOptional()
  @IsBoolean()
  notifyOwners?: boolean;

  @ApiPropertyOptional({
    description: 'Optional effective date shown in owner email (ISO date)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  notifyEffectiveDate?: string;

  @ApiPropertyOptional({
    description: 'Optional extra note included in owner email',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notifyMessage?: string;
}

export type AddonSubscriberPolicy =
  | 'keep_grandfathered'
  | 'force_remove'
  | 'convert_to_purchased';

export class AddonImpactPreviewDto {
  @ApiPropertyOptional({ enum: AddonPurchaseMode })
  @IsOptional()
  @IsEnum(AddonPurchaseMode)
  purchaseMode?: AddonPurchaseMode;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tierIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  includeInTierIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMonthly?: number;
}

export class MigrateAddonSubscribersDto {
  @ApiProperty({
    enum: ['keep_grandfathered', 'force_remove', 'convert_to_purchased'],
  })
  @IsIn(['keep_grandfathered', 'force_remove', 'convert_to_purchased'])
  policy!: AddonSubscriberPolicy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyOwners?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  notifyEffectiveDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notifyMessage?: string;

  @ApiPropertyOptional({
    description: 'Limit migration to these business IDs (default: all grandfathered)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  businessIds?: string[];
}

export class ListAddonsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: AddonPurchaseMode })
  @IsOptional()
  @IsEnum(AddonPurchaseMode)
  purchaseMode?: AddonPurchaseMode;

  @ApiPropertyOptional({ enum: AddonStatus })
  @IsOptional()
  @IsEnum(AddonStatus)
  status?: AddonStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}

export class PurchaseAddonDto {
  @ApiPropertyOptional({ default: 'MONTHLY' })
  @IsOptional()
  @IsString()
  billingCycle?: 'MONTHLY' | 'YEARLY';
}
