import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateServiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({ enum: ServiceStatus })
  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasProcessingTime?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasBufferTime?: boolean;

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
  commissionDeductionType?: ServiceCommissionType | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  commissionDeductionValue?: number | null;

  @ApiPropertyOptional({ enum: ServiceCommissionType })
  @IsOptional()
  @IsEnum(ServiceCommissionType)
  postCommissionDeductionType?: ServiceCommissionType | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  postCommissionDeductionValue?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;
}
