import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class BillingSubscriptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty()
  businessName!: string;

  @ApiProperty()
  businessSlug!: string;

  @ApiProperty()
  planId!: string;

  @ApiProperty()
  planName!: string;

  @ApiProperty()
  priceMonthly!: string;

  @ApiProperty({ enum: SubscriptionStatus })
  status!: SubscriptionStatus;

  @ApiPropertyOptional()
  currentPeriodEnd?: Date | null;

  @ApiPropertyOptional()
  canceledAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class BillingOverviewDto {
  @ApiProperty()
  mrr!: string;

  @ApiProperty()
  activeSubscriptions!: number;

  @ApiProperty()
  trialingSubscriptions!: number;

  @ApiProperty()
  pastDueSubscriptions!: number;

  @ApiProperty()
  canceledSubscriptions!: number;
}

export class AssignSubscriptionDto {
  @ApiProperty()
  @IsUUID()
  planId!: string;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string;
}
