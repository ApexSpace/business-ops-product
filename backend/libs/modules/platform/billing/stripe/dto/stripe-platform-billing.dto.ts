import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessSubscriptionBillingCycle } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class PlanTierStripeMetadataDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  monthlyPriceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  yearlyPriceId?: string;
}

export class CreatePlatformCheckoutSessionDto {
  @ApiProperty()
  @IsUUID()
  businessId!: string;

  @ApiProperty()
  @IsUUID()
  planGroupId!: string;

  @ApiProperty()
  @IsUUID()
  planTierId!: string;

  @ApiProperty({ enum: BusinessSubscriptionBillingCycle })
  @IsEnum(BusinessSubscriptionBillingCycle)
  billingCycle!: BusinessSubscriptionBillingCycle;
}

export class CreateBusinessCheckoutSessionDto {
  @ApiProperty()
  @IsUUID()
  planTierId!: string;

  @ApiProperty({ enum: BusinessSubscriptionBillingCycle })
  @IsEnum(BusinessSubscriptionBillingCycle)
  billingCycle!: BusinessSubscriptionBillingCycle;
}

export class CreatePublicCheckoutSessionDto {
  @ApiProperty()
  @IsUUID()
  planTierId!: string;

  @ApiProperty({ enum: BusinessSubscriptionBillingCycle })
  @IsEnum(BusinessSubscriptionBillingCycle)
  billingCycle!: BusinessSubscriptionBillingCycle;

  @ApiProperty()
  @IsUUID()
  businessId!: string;
}

export class CheckoutSessionResponseDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  url!: string;
}

export class PortalSessionResponseDto {
  @ApiProperty()
  url!: string;
}

export class CancelStripeSubscriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'When true, cancels immediately in Stripe (admin only).',
  })
  @IsOptional()
  @IsBoolean()
  immediate?: boolean;
}
