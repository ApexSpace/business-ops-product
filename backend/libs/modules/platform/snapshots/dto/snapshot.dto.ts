import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SnapshotStatus } from '@prisma/client';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { SnapshotAssets } from '../types/snapshot-assets.types';

export class SnapshotResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ enum: SnapshotStatus })
  status!: SnapshotStatus;

  @ApiProperty()
  assets!: SnapshotAssets;

  @ApiPropertyOptional()
  publishedAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  businessCount?: number;
}

export class SnapshotListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ enum: SnapshotStatus })
  status!: SnapshotStatus;

  @ApiPropertyOptional()
  publishedAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  businessCount!: number;
}

export class CreateSnapshotDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  assets?: SnapshotAssets;
}

export class UpdateSnapshotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: SnapshotStatus })
  @IsOptional()
  @IsEnum(SnapshotStatus)
  status?: SnapshotStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  assets?: SnapshotAssets;
}

export class ApplySnapshotDto {
  @ApiProperty()
  @IsUUID()
  businessId!: string;
}

export class SnapshotContextDto {
  @ApiPropertyOptional({ nullable: true })
  snapshotId!: string | null;

  @ApiProperty()
  snapshotName!: string;

  @ApiProperty()
  contextVersion!: string;

  @ApiProperty()
  terminology!: Record<string, string>;

  @ApiProperty()
  navigation!: SnapshotAssets['navigation'];

  @ApiProperty()
  dashboard!: SnapshotAssets['dashboard'];

  @ApiPropertyOptional()
  branding?: SnapshotAssets['branding'];
}

export class SnapshotListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SnapshotStatus })
  @IsOptional()
  @IsEnum(SnapshotStatus)
  status?: SnapshotStatus;
}
