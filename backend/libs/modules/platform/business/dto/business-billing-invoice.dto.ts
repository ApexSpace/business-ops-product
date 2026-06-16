import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionBillingSource } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { DEFAULT_LIMIT, MAX_LIMIT } from '@app/common/constants';

export class ListBusinessBillingInvoicesQueryDto {
  @ApiPropertyOptional({
    description: 'Stripe invoice id or local payment record id',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  cursor?: string;

  @ApiPropertyOptional({
    default: DEFAULT_LIMIT,
    minimum: 1,
    maximum: MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;
}

export class BusinessBillingInvoiceDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  date!: Date;

  @ApiProperty({ description: 'Decimal amount as string' })
  amount!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ enum: SubscriptionBillingSource })
  billingSource!: SubscriptionBillingSource;

  @ApiPropertyOptional({
    description: 'Stripe hosted invoice URL when billingSource is STRIPE',
  })
  stripeHostedInvoiceUrl?: string | null;

  @ApiPropertyOptional({ description: 'Plan group name at time of invoice' })
  planGroupName?: string | null;

  @ApiPropertyOptional({ description: 'Plan tier name at time of invoice' })
  planTierName?: string | null;
}

export class BusinessBillingInvoicesListDto {
  @ApiProperty({ type: [BusinessBillingInvoiceDto] })
  items!: BusinessBillingInvoiceDto[];

  @ApiPropertyOptional()
  nextCursor?: string | null;

  @ApiProperty()
  hasMore!: boolean;
}
