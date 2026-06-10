import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CapabilityStatus } from '@prisma/client';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

const KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/;

export class CreateCapabilityDto {
  @ApiPropertyOptional({
    description: 'Auto-generated from name when omitted',
  })
  @IsOptional()
  @IsString()
  @Matches(KEY_PATTERN, {
    message: 'key must be lowercase dot-separated (e.g. crm.contacts)',
  })
  key?: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CapabilityStatus })
  @IsOptional()
  @IsEnum(CapabilityStatus)
  status?: CapabilityStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateCapabilityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CapabilityStatus })
  @IsOptional()
  @IsEnum(CapabilityStatus)
  status?: CapabilityStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CapabilityCountsDto {
  @ApiProperty()
  modules!: number;

  @ApiProperty()
  features!: number;

  @ApiProperty()
  permissions!: number;

  @ApiProperty()
  limits!: number;

  @ApiProperty()
  navigationItems!: number;

  @ApiProperty()
  configSchemas!: number;
}

export class CapabilityListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  icon?: string | null;

  @ApiProperty({ enum: CapabilityStatus })
  status!: CapabilityStatus;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown> | null;

  @ApiProperty()
  _count!: CapabilityCountsDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  deletedAt?: Date | null;
}

export class CapabilityDetailDto extends CapabilityListItemDto {}

export class CapabilityStatsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  draft!: number;

  @ApiProperty()
  inactiveDeprecated!: number;
}
