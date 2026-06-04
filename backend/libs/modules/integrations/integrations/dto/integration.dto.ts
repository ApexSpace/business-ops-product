import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IntegrationCategory,
  IntegrationConnectionType,
  IntegrationStatus,
} from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class IntegrationProviderResponseDto {
  id!: string;
  key!: string;
  name!: string;
  description!: string | null;
  category!: IntegrationCategory;
  logoUrl!: string | null;
  isPlatformLevel!: boolean;
  isBusinessLevel!: boolean;
  isActive!: boolean;
  sortOrder!: number;
  connectionType!: IntegrationConnectionType;
}

export class IntegrationProviderWithStatusDto extends IntegrationProviderResponseDto {
  status!: IntegrationStatus | 'NOT_CONNECTED';
  integration!: BusinessIntegrationSummaryDto | null;
}

export class BusinessIntegrationSummaryDto {
  status!: IntegrationStatus;
  connectedAccountName!: string | null;
  connectedAccountEmail!: string | null;
  lastSyncAt!: Date | null;
  errorMessage!: string | null;
  connectedAt!: Date | null;
}

export class BusinessIntegrationResponseDto {
  id!: string;
  businessId!: string;
  providerKey!: string;
  status!: IntegrationStatus;
  config!: Record<string, unknown> | null;
  connectedAccountName!: string | null;
  connectedAccountEmail!: string | null;
  lastSyncAt!: Date | null;
  errorMessage!: string | null;
  connectedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  provider!: IntegrationProviderResponseDto;
}

export class PlatformIntegrationResponseDto {
  id!: string;
  providerKey!: string;
  status!: IntegrationStatus;
  config!: Record<string, unknown> | null;
  connectedAccountName!: string | null;
  connectedAccountEmail!: string | null;
  lastSyncAt!: Date | null;
  errorMessage!: string | null;
  connectedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  provider!: IntegrationProviderResponseDto;
}

export class PlatformIntegrationProviderWithStatusDto extends IntegrationProviderResponseDto {
  status!: IntegrationStatus | 'NOT_CONNECTED';
  integration!: PlatformIntegrationSummaryDto | null;
}

export class PlatformIntegrationSummaryDto {
  status!: IntegrationStatus;
  connectedAccountName!: string | null;
  connectedAccountEmail!: string | null;
  lastSyncAt!: Date | null;
  errorMessage!: string | null;
  connectedAt!: Date | null;
}

export class ConnectIntegrationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  connectedAccountName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  connectedAccountEmail?: string;
}

export class UpdateIntegrationDto {
  @ApiPropertyOptional({ enum: IntegrationStatus })
  @IsOptional()
  @IsEnum(IntegrationStatus)
  status?: IntegrationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  connectedAccountName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  connectedAccountEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  errorMessage?: string | null;
}

export class CreateIntegrationProviderDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  key!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: IntegrationCategory })
  @IsEnum(IntegrationCategory)
  category!: IntegrationCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPlatformLevel?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBusinessLevel?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ enum: IntegrationConnectionType })
  @IsOptional()
  @IsEnum(IntegrationConnectionType)
  connectionType?: IntegrationConnectionType;
}

export class UpdateIntegrationProviderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: IntegrationCategory })
  @IsOptional()
  @IsEnum(IntegrationCategory)
  category?: IntegrationCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPlatformLevel?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBusinessLevel?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ enum: IntegrationConnectionType })
  @IsOptional()
  @IsEnum(IntegrationConnectionType)
  connectionType?: IntegrationConnectionType;
}
