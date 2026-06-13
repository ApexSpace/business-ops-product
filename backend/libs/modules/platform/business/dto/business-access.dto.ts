import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BusinessCapabilityAssignmentStatus,
  BusinessCapabilitySource,
  BusinessStatus,
  BusinessSubscriptionBillingCycle,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionBillingSource,
  SubscriptionStatus,
} from '@prisma/client';
import type {
  BusinessAccessReasonCode,
  NeedsAttentionFlag,
} from '../types/business-access-resolution.types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class BusinessAccessSubscriptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: SubscriptionStatus })
  status!: SubscriptionStatus;

  @ApiPropertyOptional()
  planGroupId?: string | null;

  @ApiPropertyOptional({
    description: 'Joined projection from plan group — not stored on subscription.',
  })
  planGroupName?: string | null;

  @ApiPropertyOptional()
  planTierId?: string | null;

  @ApiPropertyOptional({
    description: 'Joined projection from plan tier — not stored on subscription.',
  })
  planTierName?: string | null;

  @ApiProperty({ enum: SubscriptionPaymentMethod })
  paymentMethod!: SubscriptionPaymentMethod;

  @ApiProperty({ enum: SubscriptionPaymentStatus })
  paymentStatus!: SubscriptionPaymentStatus;

  @ApiProperty({ enum: SubscriptionBillingSource })
  billingSource!: SubscriptionBillingSource;

  @ApiPropertyOptional({ enum: BusinessSubscriptionBillingCycle })
  billingCycle?: BusinessSubscriptionBillingCycle | null;

  @ApiPropertyOptional()
  currentPeriodStart?: Date | null;

  @ApiPropertyOptional()
  currentPeriodEnd?: Date | null;

  @ApiPropertyOptional()
  amount?: string | null;

  @ApiPropertyOptional()
  currency?: string | null;

  @ApiPropertyOptional({
    description:
      'Computed from plan tier price when amount is unset — not persisted.',
  })
  suggestedAmount?: string | null;

  @ApiPropertyOptional({
    description:
      'Computed currency hint when amount is unset — not persisted.',
  })
  suggestedCurrency?: string | null;

  @ApiPropertyOptional({
    description: 'Computed next billing/trial/payment date — not persisted.',
  })
  nextBillingDate?: Date | null;

  @ApiPropertyOptional({
    description: 'Computed label for next billing display — not persisted.',
  })
  nextBillingLabel?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  canceledAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class BusinessCapabilityDto {
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

  @ApiProperty({ enum: BusinessCapabilitySource })
  source!: BusinessCapabilitySource;

  @ApiProperty({ enum: BusinessCapabilityAssignmentStatus })
  status!: BusinessCapabilityAssignmentStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class BusinessAccessResolutionDto {
  @ApiProperty({
    description:
      'Computed access gate — not stored. Requires ACTIVE business and allowed subscription status.',
  })
  canAccessWorkspace!: boolean;

  @ApiProperty()
  reasonCode!: BusinessAccessReasonCode;

  @ApiProperty()
  reasonLabel!: string;

  @ApiProperty({ type: [String] })
  warnings!: string[];

  @ApiProperty({ type: [String] })
  needsAttention!: NeedsAttentionFlag[];

  @ApiProperty({ type: [Object] })
  effectiveCapabilities!: { key: string; name: string }[];
}

export class BusinessAccessDto {
  @ApiProperty()
  businessId!: string;

  @ApiProperty({ enum: BusinessStatus })
  businessStatus!: BusinessStatus;

  @ApiPropertyOptional()
  snapshotId?: string | null;

  @ApiPropertyOptional()
  snapshotName?: string | null;

  @ApiPropertyOptional()
  snapshotAppliedAt?: Date | null;

  @ApiPropertyOptional({ type: BusinessAccessSubscriptionDto })
  subscription?: BusinessAccessSubscriptionDto | null;

  @ApiProperty({ type: [BusinessCapabilityDto] })
  capabilities!: BusinessCapabilityDto[];

  @ApiProperty({
    type: BusinessAccessResolutionDto,
    description: 'Computed access projection — not stored on business or subscription.',
  })
  resolution!: BusinessAccessResolutionDto;
}

export class UpdateBusinessAccessDto {
  @ApiPropertyOptional({ enum: BusinessStatus })
  @IsOptional()
  @IsEnum(BusinessStatus)
  businessStatus?: BusinessStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  snapshotId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planGroupId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planTierId?: string | null;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;

  @ApiPropertyOptional({ enum: SubscriptionPaymentMethod })
  @IsOptional()
  @IsEnum(SubscriptionPaymentMethod)
  paymentMethod?: SubscriptionPaymentMethod;

  @ApiPropertyOptional({ enum: SubscriptionPaymentStatus })
  @IsOptional()
  @IsEnum(SubscriptionPaymentStatus)
  paymentStatus?: SubscriptionPaymentStatus;

  @ApiPropertyOptional({ enum: BusinessSubscriptionBillingCycle })
  @IsOptional()
  @IsEnum(BusinessSubscriptionBillingCycle)
  billingCycle?: BusinessSubscriptionBillingCycle | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentPeriodStart?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @ApiPropertyOptional({
    description: 'When true, syncs capabilities from the selected plan tier after save.',
  })
  @IsOptional()
  syncCapabilitiesFromTier?: boolean;

  @ApiPropertyOptional({
    description: 'When true, applies the selected snapshot after updating the reference.',
  })
  @IsOptional()
  @IsBoolean()
  applySnapshot?: boolean;
}

export class BusinessAccessCreateFieldsDto {
  @ApiPropertyOptional({ enum: BusinessStatus })
  @IsOptional()
  @IsEnum(BusinessStatus)
  status?: BusinessStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planGroupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planTierId?: string;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;

  @ApiPropertyOptional({ enum: SubscriptionPaymentMethod })
  @IsOptional()
  @IsEnum(SubscriptionPaymentMethod)
  paymentMethod?: SubscriptionPaymentMethod;

  @ApiPropertyOptional({ enum: SubscriptionPaymentStatus })
  @IsOptional()
  @IsEnum(SubscriptionPaymentStatus)
  paymentStatus?: SubscriptionPaymentStatus;

  @ApiPropertyOptional({ enum: BusinessSubscriptionBillingCycle })
  @IsOptional()
  @IsEnum(BusinessSubscriptionBillingCycle)
  billingCycle?: BusinessSubscriptionBillingCycle;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentPeriodStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'When true, copies plan tier capabilities into business assignments.',
  })
  @IsOptional()
  syncCapabilitiesFromTier?: boolean;

  @ApiPropertyOptional({
    description: 'Send workspace invite to the profile contact email as ADMIN.',
  })
  @IsOptional()
  @IsBoolean()
  inviteOwner?: boolean;

  @ApiPropertyOptional({
    description:
      'Simplified create flow: payment was collected at provisioning time.',
  })
  @IsOptional()
  @IsBoolean()
  paymentCollected?: boolean;

  @ApiPropertyOptional({
    enum: ['TRIAL', 'PENDING_PAYMENT', 'INTERNAL'],
    description:
      'When paymentCollected is false, selects trial, pending payment, or internal access.',
  })
  @IsOptional()
  @IsString()
  unpaidAccessMode?: 'TRIAL' | 'PENDING_PAYMENT' | 'INTERNAL';

  @ApiPropertyOptional({
    description:
      'When true and payment status is PAID with an amount, creates a subscription payment record on create.',
  })
  @IsOptional()
  @IsBoolean()
  recordInitialPayment?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentReference?: string;
}

export class ExtendTrialDto {
  @ApiPropertyOptional({
    description: 'Explicit period end date (ISO date). Overrides days when set.',
  })
  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string;

  @ApiPropertyOptional({
    description: 'Extend trial by this many days from today or current period end.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  days?: number;
}

export class UpdateBusinessCapabilityItemDto {
  @ApiProperty()
  @IsUUID()
  capabilityId!: string;

  @ApiPropertyOptional({ enum: BusinessCapabilityAssignmentStatus })
  @IsOptional()
  @IsEnum(BusinessCapabilityAssignmentStatus)
  status?: BusinessCapabilityAssignmentStatus;

  @ApiPropertyOptional({ enum: BusinessCapabilitySource })
  @IsOptional()
  @IsEnum(BusinessCapabilitySource)
  source?: BusinessCapabilitySource;
}

export class UpdateBusinessCapabilitiesDto {
  @ApiProperty({ type: [UpdateBusinessCapabilityItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBusinessCapabilityItemDto)
  capabilities!: UpdateBusinessCapabilityItemDto[];
}

export class BusinessListAccessSummaryDto {
  @ApiPropertyOptional({ enum: SubscriptionStatus })
  subscriptionStatus?: SubscriptionStatus | null;

  @ApiPropertyOptional()
  planTierName?: string | null;

  @ApiPropertyOptional()
  planTierId?: string | null;

  @ApiPropertyOptional({ enum: SubscriptionPaymentStatus })
  paymentStatus?: SubscriptionPaymentStatus | null;

  @ApiProperty()
  canAccessWorkspace!: boolean;

  @ApiProperty()
  reasonCode!: BusinessAccessReasonCode;

  @ApiProperty()
  reasonLabel!: string;

  @ApiProperty({ type: [String] })
  needsAttention!: NeedsAttentionFlag[];
}
