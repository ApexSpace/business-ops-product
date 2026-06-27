import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceStatus, ServiceResourceType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class ListResourcesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({ enum: ServiceResourceType })
  @IsOptional()
  @IsEnum(ServiceResourceType)
  resourceType?: ServiceResourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class CreateResourceDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: ServiceResourceType })
  @IsEnum(ServiceResourceType)
  resourceType!: ServiceResourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  groupId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}

export class UpdateResourceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ enum: ServiceResourceType })
  @IsOptional()
  @IsEnum(ServiceResourceType)
  resourceType?: ServiceResourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  groupId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ enum: ResourceStatus })
  @IsOptional()
  @IsEnum(ResourceStatus)
  status?: ResourceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ResourceListItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiPropertyOptional()
  groupId?: string | null;

  @ApiPropertyOptional()
  groupName?: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ServiceResourceType })
  resourceType!: ServiceResourceType;

  @ApiProperty({ enum: ResourceStatus })
  status!: ResourceStatus;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ResourcePickerItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ServiceResourceType })
  resourceType!: ServiceResourceType;

  @ApiPropertyOptional()
  groupName?: string | null;
}
