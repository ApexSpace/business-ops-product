import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BusinessSubscriptionBillingCycle,
  BusinessSubscriptionPaymentDirection,
  BusinessSubscriptionPaymentSource,
  BusinessSubscriptionPaymentType,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { CursorPaginationQueryDto } from '@app/common/dto/cursor-pagination-query.dto';

export class ListSubscriptionPaymentsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: SubscriptionPaymentStatus })
  @IsOptional()
  @IsEnum(SubscriptionPaymentStatus)
  paymentStatus?: SubscriptionPaymentStatus;

  @ApiPropertyOptional({ enum: SubscriptionPaymentMethod })
  @IsOptional()
  @IsEnum(SubscriptionPaymentMethod)
  paymentMethod?: SubscriptionPaymentMethod;

  @ApiPropertyOptional({ enum: BusinessSubscriptionPaymentType })
  @IsOptional()
  @IsEnum(BusinessSubscriptionPaymentType)
  paymentType?: BusinessSubscriptionPaymentType;

  @ApiPropertyOptional({
    enum: BusinessSubscriptionPaymentDirection,
    name: 'paymentDirection',
  })
  @IsOptional()
  @IsEnum(BusinessSubscriptionPaymentDirection)
  paymentDirection?: BusinessSubscriptionPaymentDirection;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'When false, includes voided records. Default excludes voided.',
  })
  @IsOptional()
  includeVoided?: boolean;
}

export class RecordPaymentDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @ApiProperty()
  @IsString()
  @MaxLength(3)
  currency!: string;

  @ApiProperty({ enum: SubscriptionPaymentMethod })
  @IsEnum(SubscriptionPaymentMethod)
  paymentMethod!: SubscriptionPaymentMethod;

  @ApiPropertyOptional({ enum: SubscriptionPaymentStatus })
  @IsOptional()
  @IsEnum(SubscriptionPaymentStatus)
  paymentStatus?: SubscriptionPaymentStatus;

  @ApiPropertyOptional({ enum: BusinessSubscriptionPaymentType })
  @IsOptional()
  @IsEnum(BusinessSubscriptionPaymentType)
  paymentType?: BusinessSubscriptionPaymentType;

  @ApiPropertyOptional({ enum: BusinessSubscriptionBillingCycle })
  @IsOptional()
  @IsEnum(BusinessSubscriptionBillingCycle)
  billingCycle?: BusinessSubscriptionBillingCycle;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'When true, activates subscription after recording payment.',
  })
  @IsOptional()
  activateSubscription?: boolean;

  @ApiPropertyOptional({ enum: BusinessSubscriptionPaymentSource })
  @IsOptional()
  @IsEnum(BusinessSubscriptionPaymentSource)
  source?: BusinessSubscriptionPaymentSource;
}

export class VoidPaymentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class RefundPaymentDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({ enum: BusinessSubscriptionPaymentType })
  @IsOptional()
  @IsEnum(BusinessSubscriptionPaymentType)
  paymentType?: BusinessSubscriptionPaymentType;
}

export class BusinessSubscriptionPaymentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiPropertyOptional()
  subscriptionId?: string | null;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ enum: SubscriptionPaymentMethod })
  paymentMethod!: SubscriptionPaymentMethod;

  @ApiProperty({
    enum: SubscriptionPaymentStatus,
    description: 'Status for this payment record only — not the subscription aggregate.',
  })
  paymentStatus!: SubscriptionPaymentStatus;

  @ApiProperty({ enum: BusinessSubscriptionPaymentType })
  paymentType!: BusinessSubscriptionPaymentType;

  @ApiProperty({ enum: BusinessSubscriptionBillingCycle })
  billingCycle!: BusinessSubscriptionBillingCycle;

  @ApiProperty({ enum: BusinessSubscriptionPaymentDirection })
  direction!: BusinessSubscriptionPaymentDirection;

  @ApiProperty({ enum: BusinessSubscriptionPaymentSource })
  source!: BusinessSubscriptionPaymentSource;

  @ApiPropertyOptional()
  periodStart?: Date | null;

  @ApiPropertyOptional()
  periodEnd?: Date | null;

  @ApiPropertyOptional()
  dueDate?: Date | null;

  @ApiPropertyOptional()
  paidAt?: Date | null;

  @ApiProperty()
  recordedAt!: Date;

  @ApiPropertyOptional()
  voidedAt?: Date | null;

  @ApiPropertyOptional()
  voidReason?: string | null;

  @ApiPropertyOptional()
  paymentReference?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  externalProvider?: string | null;

  @ApiPropertyOptional()
  externalPaymentId?: string | null;

  @ApiPropertyOptional()
  createdById?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class SubscriptionPaymentsListDto {
  @ApiProperty({ type: [BusinessSubscriptionPaymentDto] })
  items!: BusinessSubscriptionPaymentDto[];

  @ApiPropertyOptional()
  nextCursor?: string | null;

  @ApiProperty()
  hasMore!: boolean;
}
