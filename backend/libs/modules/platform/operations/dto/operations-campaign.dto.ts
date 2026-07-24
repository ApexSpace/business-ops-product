import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EntitlementChangeCampaignPolicy,
  EntitlementChangeCampaignStatus,
  EntitlementChangeCampaignType,
} from '@prisma/client';
import { Type } from 'class-transformer';

export class ListCampaignsQueryDto {
  @ApiPropertyOptional({ enum: EntitlementChangeCampaignType })
  @IsOptional()
  @IsEnum(EntitlementChangeCampaignType)
  type?: EntitlementChangeCampaignType;

  @ApiPropertyOptional({ enum: EntitlementChangeCampaignStatus })
  @IsOptional()
  @IsEnum(EntitlementChangeCampaignStatus)
  status?: EntitlementChangeCampaignStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class CampaignNotifyDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  businessIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveAt?: string;
}

export class CampaignExtendDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  businessIds?: string[];

  @ApiPropertyOptional({ description: 'Extend by this many days from current effective date' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveAt?: string;
}

export class CampaignMigrateDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  businessIds?: string[];

  @ApiPropertyOptional({ enum: EntitlementChangeCampaignPolicy })
  @IsOptional()
  @IsEnum(EntitlementChangeCampaignPolicy)
  policy?: EntitlementChangeCampaignPolicy;
}

export class CampaignMembersPatchDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  businessIds!: string[];

  @ApiProperty()
  @IsBoolean()
  included!: boolean;
}

export class CreateCampaignDto {
  @ApiProperty({ enum: EntitlementChangeCampaignType })
  @IsEnum(EntitlementChangeCampaignType)
  type!: EntitlementChangeCampaignType;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  summary!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ enum: EntitlementChangeCampaignPolicy })
  @IsOptional()
  @IsEnum(EntitlementChangeCampaignPolicy)
  policy?: EntitlementChangeCampaignPolicy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  addonId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  capabilityId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  featureKeys?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  businessIds!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoForce?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  payload?: Record<string, unknown>;
}
