import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CapabilityModuleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const KEY_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/;

/** Catalog option definition exposed to the admin UI. */
export class RegistryModuleOptionDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional()
  group?: string | null;
}

/** Flat platform module from the code catalog (admin-facing). */
export class RegistryModuleCatalogDto {
  @ApiProperty()
  moduleKey!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  icon?: string | null;

  @ApiProperty()
  featureCount!: number;

  @ApiProperty({ type: [RegistryModuleOptionDto] })
  availableOptions!: RegistryModuleOptionDto[];
}

/** Enabled module options keyed by stable option key (e.g. contacts.list). */
export class ModuleOptionsDto {
  [optionKey: string]: boolean | undefined;
}

/** Module assigned to a capability bundle. */
export class AssignedCapabilityModuleDto {
  @ApiProperty()
  moduleKey!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  icon?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'boolean' } })
  options!: Record<string, boolean>;

  @ApiProperty()
  enabled!: boolean;
}

export class CapabilityModuleSyncItemDto {
  @ApiProperty()
  @IsString()
  moduleKey!: string;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'boolean' } })
  @IsObject()
  options!: Record<string, boolean>;
}

export class SyncCapabilityModulesDto {
  @ApiProperty({ type: [CapabilityModuleSyncItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapabilityModuleSyncItemDto)
  modules!: CapabilityModuleSyncItemDto[];
}

export class AssignCapabilityModulesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  moduleKeys!: string[];
}

export class BulkModuleAssignResultDto {
  @ApiProperty({ type: [String] })
  assigned!: string[];

  @ApiProperty({ type: [String] })
  skipped!: string[];
}

export class CreateCapabilityModuleDto {
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

  @ApiPropertyOptional({ enum: CapabilityModuleStatus })
  @IsOptional()
  @IsEnum(CapabilityModuleStatus)
  status?: CapabilityModuleStatus;

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

export class UpdateCapabilityModuleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CapabilityModuleStatus })
  @IsOptional()
  @IsEnum(CapabilityModuleStatus)
  status?: CapabilityModuleStatus;

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

export class CapabilityModuleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  capabilityId!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ enum: CapabilityModuleStatus })
  status!: CapabilityModuleStatus;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown> | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
