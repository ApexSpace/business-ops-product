import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
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

export class TenantEffectiveCapabilityDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;
}

export class TenantAccessSubscriptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: SubscriptionStatus })
  status!: SubscriptionStatus;

  @ApiPropertyOptional()
  planGroupId?: string | null;

  @ApiPropertyOptional()
  planGroupName?: string | null;

  @ApiPropertyOptional()
  planTierId?: string | null;

  @ApiPropertyOptional()
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
}

export class BusinessTenantAccessDto {
  @ApiProperty()
  businessId!: string;

  @ApiProperty()
  businessName!: string;

  @ApiProperty({ enum: BusinessStatus })
  businessStatus!: BusinessStatus;

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

  @ApiPropertyOptional({ type: TenantAccessSubscriptionDto })
  subscription?: TenantAccessSubscriptionDto | null;

  @ApiProperty({ type: [TenantEffectiveCapabilityDto] })
  effectiveCapabilities!: TenantEffectiveCapabilityDto[];
}
