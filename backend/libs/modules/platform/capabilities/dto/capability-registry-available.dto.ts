import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { CapabilityFeatureStatus } from '@prisma/client';
import type { RegistryAvailableFeature } from '../types/capability-registry.types';

export class RegistryFeatureDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  moduleKey!: string;

  @ApiProperty()
  moduleName!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  permissionKey?: string | null;

  @ApiPropertyOptional({ type: [String] })
  routeKeys?: string[];

  @ApiPropertyOptional()
  icon?: string | null;

  @ApiProperty()
  defaultEnabled!: boolean;

  @ApiProperty()
  isBillable!: boolean;

  @ApiPropertyOptional()
  limitKey?: string | null;

  @ApiProperty({ enum: ['CODE', 'MANUAL'] })
  source!: 'CODE' | 'MANUAL';

  @ApiProperty()
  status!: string;
}

export class RegistryModuleDto {
  @ApiProperty()
  moduleKey!: string;

  @ApiProperty()
  moduleName!: string;

  @ApiProperty({ type: [RegistryFeatureDto] })
  features!: RegistryFeatureDto[];
}

export class RegistryAvailableFeatureDto implements RegistryAvailableFeature {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  moduleKey!: string;

  @ApiProperty()
  moduleName!: string;

  @ApiPropertyOptional()
  permissionKey?: string | null;

  @ApiPropertyOptional({ type: [String] })
  routeKeys?: string[];

  @ApiPropertyOptional()
  icon?: string | null;

  @ApiProperty()
  defaultEnabled!: boolean;

  @ApiProperty()
  isBillable!: boolean;

  @ApiPropertyOptional()
  limitKey?: string | null;

  @ApiProperty({ enum: ['CODE', 'MANUAL'] })
  source!: 'CODE' | 'MANUAL';

  @ApiProperty()
  status!: string;

  @ApiProperty()
  assigned!: boolean;

  @ApiPropertyOptional()
  assignmentId?: string;

  @ApiPropertyOptional()
  assignmentStatus?: string;
}

export class DerivedCapabilityModuleDto {
  @ApiProperty()
  moduleKey!: string;

  @ApiProperty()
  moduleName!: string;

  @ApiProperty()
  featureCount!: number;

  @ApiProperty({ type: [RegistryAvailableFeatureDto] })
  features!: RegistryAvailableFeatureDto[];
}

export class AssignCapabilityFeaturesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  featureKeys!: string[];
}

export class AssignedCapabilityFeatureDto {
  @ApiProperty()
  assignmentId!: string;

  @ApiProperty()
  capabilityId!: string;

  @ApiProperty()
  featureKey!: string;

  @ApiProperty({ enum: CapabilityFeatureStatus })
  status!: CapabilityFeatureStatus;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ type: RegistryFeatureDto })
  registry!: RegistryFeatureDto;
}

export class UpdateCapabilityFeatureAssignmentDto {
  @ApiPropertyOptional({ enum: CapabilityFeatureStatus })
  @IsOptional()
  @IsEnum(CapabilityFeatureStatus)
  status?: CapabilityFeatureStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateManualRegistryFeatureDto {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsString()
  moduleKey!: string;

  @ApiProperty()
  @IsString()
  moduleName!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permissionKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  defaultEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;
}

export class BulkAssignResultDto {
  @ApiProperty({ type: [String] })
  assigned!: string[];

  @ApiProperty({ type: [String] })
  skipped!: string[];
}
