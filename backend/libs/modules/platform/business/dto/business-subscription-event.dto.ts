import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BusinessSubscriptionEventSeverity,
  BusinessSubscriptionEventSource,
  BusinessSubscriptionEventType,
  SubscriptionStatus,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { CursorPaginationQueryDto } from '@app/common/dto/cursor-pagination-query.dto';
import type { SubscriptionStateSnapshot } from '../types/subscription-state-snapshot.types';

function parseCommaSeparatedEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const raw = Array.isArray(value) ? value.join(',') : String(value);
  const parsed = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part): part is T => allowed.includes(part as T));
  return parsed.length > 0 ? parsed : undefined;
}

const EVENT_TYPES = Object.values(BusinessSubscriptionEventType);

export class ListSubscriptionEventsQueryDto extends CursorPaginationQueryDto {
  @ApiPropertyOptional({ enum: BusinessSubscriptionEventType })
  @IsOptional()
  @IsEnum(BusinessSubscriptionEventType)
  eventType?: BusinessSubscriptionEventType;

  @ApiPropertyOptional({
    description: 'Comma-separated event types (overrides eventType when set)',
  })
  @IsOptional()
  @Transform(({ value }) => parseCommaSeparatedEnum(value, EVENT_TYPES))
  eventTypes?: BusinessSubscriptionEventType[];

  @ApiPropertyOptional({ enum: BusinessSubscriptionEventSource })
  @IsOptional()
  @IsEnum(BusinessSubscriptionEventSource)
  source?: BusinessSubscriptionEventSource;

  @ApiPropertyOptional({ enum: BusinessSubscriptionEventSeverity })
  @IsOptional()
  @IsEnum(BusinessSubscriptionEventSeverity)
  severity?: BusinessSubscriptionEventSeverity;

  @ApiPropertyOptional({
    enum: SubscriptionStatus,
    description:
      'Filter events where fromState or toState subscriptionStatus matches',
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description:
      'Search title, description, notes, actor name, event type, and plan tier names/ids in snapshots',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class BusinessSubscriptionEventListItemDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  subscriptionId?: string | null;

  @ApiProperty({ enum: BusinessSubscriptionEventType })
  eventType!: BusinessSubscriptionEventType;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: BusinessSubscriptionEventSource })
  source!: BusinessSubscriptionEventSource;

  @ApiProperty({ enum: BusinessSubscriptionEventSeverity })
  severity!: BusinessSubscriptionEventSeverity;

  @ApiPropertyOptional()
  actionKey?: string | null;

  @ApiPropertyOptional()
  paymentId?: string | null;

  @ApiPropertyOptional()
  createdByNameSnapshot?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional({
    description: 'Derived from fromState/toState plan tier names at map time.',
  })
  planTierLabel?: string | null;

  @ApiPropertyOptional({
    description: 'Derived subscription status transition label.',
  })
  statusTransition?: string | null;

  @ApiPropertyOptional({
    description: 'Derived payment summary from state snapshots.',
  })
  paymentSnippet?: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class BusinessSubscriptionEventDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiPropertyOptional()
  subscriptionId?: string | null;

  @ApiProperty({ enum: BusinessSubscriptionEventType })
  eventType!: BusinessSubscriptionEventType;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  fromState?: SubscriptionStateSnapshot | null;

  @ApiPropertyOptional()
  toState?: SubscriptionStateSnapshot | null;

  @ApiProperty({ enum: BusinessSubscriptionEventSource })
  source!: BusinessSubscriptionEventSource;

  @ApiProperty({ enum: BusinessSubscriptionEventSeverity })
  severity!: BusinessSubscriptionEventSeverity;

  @ApiProperty()
  correlationId!: string;

  @ApiPropertyOptional()
  actionKey?: string | null;

  @ApiPropertyOptional()
  paymentId?: string | null;

  @ApiPropertyOptional()
  reason?: string | null;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  createdById?: string | null;

  @ApiPropertyOptional()
  createdByNameSnapshot?: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class SubscriptionEventsListDto {
  @ApiProperty({ type: [BusinessSubscriptionEventListItemDto] })
  items!: BusinessSubscriptionEventListItemDto[];

  @ApiPropertyOptional()
  nextCursor?: string | null;

  @ApiProperty()
  hasMore!: boolean;
}
