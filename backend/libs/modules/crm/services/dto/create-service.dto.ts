import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceCommissionType, ServiceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'Botox' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 350 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasProcessingTime?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  processingDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  finishDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasBufferTime?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bufferBeforeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bufferAfterMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  usesProducts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresNoStaff?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresTwoStaff?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasCommissionDeduction?: boolean;

  @ApiPropertyOptional({ enum: ServiceCommissionType })
  @IsOptional()
  @IsEnum(ServiceCommissionType)
  commissionDeductionType?: ServiceCommissionType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  commissionDeductionValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;

  @ApiPropertyOptional({ enum: ServiceStatus })
  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;
}
