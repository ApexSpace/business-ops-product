import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class FeatureRowTierValueDto {
  @ApiProperty()
  included!: boolean;

  @ApiPropertyOptional()
  text?: string;
}

export class CreatePlanFeatureRowDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tooltip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  values?: Record<string, FeatureRowTierValueDto>;

  @ApiPropertyOptional()
  @IsOptional()
  sortOrder?: number;
}

export class UpdatePlanFeatureRowDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tooltip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  values?: Record<string, FeatureRowTierValueDto>;

  @ApiPropertyOptional()
  @IsOptional()
  sortOrder?: number;
}

export class ReorderPlanFeatureRowsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  rowIds!: string[];
}

export class PlanFeatureRowDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  planGroupId!: string;

  @ApiProperty()
  label!: string;

  @ApiPropertyOptional()
  tooltip?: string | null;

  @ApiProperty()
  values!: Record<string, FeatureRowTierValueDto>;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
