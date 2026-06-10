import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanGroupStatus } from '@prisma/client';
import type { PlanGroupDesignSettings } from '../types/plan-design-settings.types';
import { PlanTierDto } from './plan-tier.dto';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreatePlanGroupDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: PlanGroupStatus })
  @IsOptional()
  @IsEnum(PlanGroupStatus)
  status?: PlanGroupStatus;

  @ApiPropertyOptional({ type: [String], default: ['MONTHLY', 'YEARLY'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  billingCycles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultCtaLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultCtaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  designSettings?: PlanGroupDesignSettings;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  snapshotId?: string;
}

export class UpdatePlanGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  billingCycles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultCtaLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultCtaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  designSettings?: PlanGroupDesignSettings;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID('4')
  snapshotId?: string | null;
}

export class PlanGroupCountsDto {
  @ApiProperty()
  tiers!: number;

  @ApiProperty()
  featureRows!: number;
}

export class PlanGroupListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ enum: PlanGroupStatus })
  status!: PlanGroupStatus;

  @ApiProperty()
  updatedAt!: string;

  @ApiPropertyOptional()
  publishedAt?: string | null;

  @ApiProperty({ type: PlanGroupCountsDto })
  _count!: PlanGroupCountsDto;
}

export class PlanGroupDetailDto extends PlanGroupListItemDto {
  @ApiProperty({ type: [String] })
  billingCycles!: string[];

  @ApiPropertyOptional()
  defaultCtaLabel?: string | null;

  @ApiPropertyOptional()
  defaultCtaUrl?: string | null;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  designSettings?: PlanGroupDesignSettings | null;

  @ApiPropertyOptional()
  snapshotId?: string | null;

  @ApiPropertyOptional()
  snapshotName?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ type: [PlanTierDto] })
  tiers!: PlanTierDto[];
}

export class PlanGroupStatsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  published!: number;

  @ApiProperty()
  draft!: number;

  @ApiProperty()
  archived!: number;
}
