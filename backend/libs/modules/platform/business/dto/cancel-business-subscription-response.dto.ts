import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BusinessSubscriptionBillingCycle,
  SubscriptionBillingSource,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';

export class CancelBusinessSubscriptionResponseDto {
  @ApiProperty()
  businessId!: string;

  @ApiProperty()
  subscriptionId!: string;

  @ApiProperty({ enum: SubscriptionStatus })
  status!: SubscriptionStatus;

  @ApiProperty({ enum: SubscriptionBillingSource })
  billingSource!: SubscriptionBillingSource;

  @ApiProperty({ enum: SubscriptionPaymentMethod })
  paymentMethod!: SubscriptionPaymentMethod;

  @ApiProperty({ enum: SubscriptionPaymentStatus })
  paymentStatus!: SubscriptionPaymentStatus;

  @ApiPropertyOptional({ enum: BusinessSubscriptionBillingCycle })
  billingCycle?: BusinessSubscriptionBillingCycle | null;

  @ApiPropertyOptional()
  currentPeriodEnd?: Date | null;

  @ApiPropertyOptional()
  cancelAtPeriodEnd?: boolean;

  @ApiPropertyOptional()
  cancelAt?: Date | null;
}
