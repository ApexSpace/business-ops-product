import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IntegrationResourceStatus,
  IntegrationResourceType,
} from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class IntegrationResourceResponseDto {
  id!: string;
  businessIntegrationId!: string;
  businessId!: string;
  providerKey!: string;
  externalId!: string;
  name!: string;
  type!: IntegrationResourceType;
  metadata!: Record<string, unknown> | null;
  isSelected!: boolean;
  isDefault!: boolean;
  status!: IntegrationResourceStatus;
  lastSyncedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class IntegrationResourcesListResponseDto {
  resources!: IntegrationResourceResponseDto[];
  providerKey!: string;
  supportsResources!: boolean;
  syncEnabled!: boolean;
  resourceLabel!: string | null;
}

export class SyncIntegrationResourcesResponseDto {
  resources!: IntegrationResourceResponseDto[];
  synced!: boolean;
  message!: string | null;
}

export class UpdateIntegrationResourceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ enum: IntegrationResourceStatus })
  @IsOptional()
  @IsEnum(IntegrationResourceStatus)
  status?: IntegrationResourceStatus;
}
