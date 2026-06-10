import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  BusinessStatus,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';
import type { NeedsAttentionFlag } from '../types/business-access-resolution.types';

const NEEDS_ATTENTION_FLAGS = [
  'TRIAL_EXPIRED',
  'PENDING_PAYMENT',
  'ACTIVE_WITH_EXPIRED_SUBSCRIPTION',
  'ACTIVE_WITH_CANCELED_SUBSCRIPTION',
  'NO_PLAN_TIER',
  'NO_CAPABILITIES',
  'SNAPSHOT_NOT_APPLIED',
  'OWNER_INVITED_WHILE_INACTIVE',
] as const satisfies readonly NeedsAttentionFlag[];

export class ListPlatformBusinessesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BusinessStatus })
  @IsOptional()
  @IsEnum(BusinessStatus)
  status?: BusinessStatus;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;

  @ApiPropertyOptional({ enum: SubscriptionPaymentStatus })
  @IsOptional()
  @IsEnum(SubscriptionPaymentStatus)
  paymentStatus?: SubscriptionPaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planGroupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  planTierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  canAccess?: boolean;

  @ApiPropertyOptional({ enum: NEEDS_ATTENTION_FLAGS })
  @IsOptional()
  @IsIn(NEEDS_ATTENTION_FLAGS)
  needsAttention?: NeedsAttentionFlag;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
