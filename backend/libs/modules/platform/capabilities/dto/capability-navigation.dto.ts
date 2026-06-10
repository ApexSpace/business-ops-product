import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CapabilityNavigationStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

const KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/;

export class CreateCapabilityNavigationDto {
  @ApiProperty()
  @IsString()
  @Matches(KEY_PATTERN)
  key!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  label!: string;

  @ApiProperty()
  @IsString()
  route!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  moduleId?: string;

  @ApiPropertyOptional({ enum: CapabilityNavigationStatus })
  @IsOptional()
  @IsEnum(CapabilityNavigationStatus)
  status?: CapabilityNavigationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requiredFeatureKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requiredPermissionKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateCapabilityNavigationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  moduleId?: string | null;

  @ApiPropertyOptional({ enum: CapabilityNavigationStatus })
  @IsOptional()
  @IsEnum(CapabilityNavigationStatus)
  status?: CapabilityNavigationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requiredFeatureKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requiredPermissionKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CapabilityNavigationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  capabilityId!: string;

  @ApiPropertyOptional()
  moduleId?: string | null;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  route!: string;

  @ApiPropertyOptional()
  icon?: string | null;

  @ApiProperty({ enum: CapabilityNavigationStatus })
  status!: CapabilityNavigationStatus;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional()
  requiredFeatureKey?: string | null;

  @ApiPropertyOptional()
  requiredPermissionKey?: string | null;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
