import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CapabilityFeatureSource,
  CapabilityFeatureStatus,
} from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';

const KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/;

export class CreateCapabilityFeatureDto {
  @ApiProperty()
  @IsString()
  @Matches(KEY_PATTERN)
  key!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @ApiPropertyOptional({ enum: CapabilityFeatureStatus })
  @IsOptional()
  @IsEnum(CapabilityFeatureStatus)
  status?: CapabilityFeatureStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  defaultEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permissionKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limitKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateCapabilityFeatureDto {
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
  @IsUUID()
  moduleId?: string | null;

  @ApiPropertyOptional({ enum: CapabilityFeatureStatus })
  @IsOptional()
  @IsEnum(CapabilityFeatureStatus)
  status?: CapabilityFeatureStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  defaultEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permissionKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limitKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CapabilityFeatureResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  capabilityId!: string;

  @ApiPropertyOptional()
  moduleId?: string | null;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ enum: CapabilityFeatureStatus })
  status!: CapabilityFeatureStatus;

  @ApiProperty({ enum: CapabilityFeatureSource })
  source!: CapabilityFeatureSource;

  @ApiProperty()
  defaultEnabled!: boolean;

  @ApiProperty()
  isBillable!: boolean;

  @ApiPropertyOptional()
  permissionKey?: string | null;

  @ApiPropertyOptional()
  limitKey?: string | null;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
