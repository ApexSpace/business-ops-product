import { IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DataImportDuplicatePolicy,
  DataImportEntityType,
} from '@prisma/client';

export class CreateDataImportDto {
  @ApiProperty({ enum: DataImportEntityType })
  @IsEnum(DataImportEntityType)
  entityType!: DataImportEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerPreset?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezoneDefault?: string;
}

export class AttachDataImportFileDto {
  @ApiProperty()
  @IsString()
  fileAssetId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sheetName?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  headerRowNumber?: number;
}

export class ColumnMappingDto {
  @ApiProperty()
  @IsString()
  sourceColumn!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  target!: string | null;

  @ApiProperty({ enum: ['map', 'skip', 'append_to_notes'] })
  @IsString()
  action!: 'map' | 'skip' | 'append_to_notes';
}

export class ConfigureDataImportDto {
  @ApiProperty({ type: [ColumnMappingDto] })
  @ValidateNested({ each: true })
  @Type(() => ColumnMappingDto)
  mapping!: ColumnMappingDto[];

  @ApiPropertyOptional({ enum: DataImportDuplicatePolicy })
  @IsOptional()
  @IsEnum(DataImportDuplicatePolicy)
  duplicatePolicy?: DataImportDuplicatePolicy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerPreset?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezoneDefault?: string;

  @ApiPropertyOptional()
  @IsOptional()
  restoreDeleted?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  autoCreateTags?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sheetName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  headerRowNumber?: number;
}

export class ListDataImportsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(DataImportEntityType)
  entityType?: DataImportEntityType;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class DataExportQueryDto {
  @ApiProperty({ enum: DataImportEntityType })
  @IsEnum(DataImportEntityType)
  entityType!: DataImportEntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
