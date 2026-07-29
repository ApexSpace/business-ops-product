import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ServiceCommissionType,
  ServicePaymentRequirement,
  ServiceResourceType,
  ServiceStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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
  ValidateNested,
} from 'class-validator';

export class PatchServiceDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

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
  @IsUUID()
  categoryId?: string;

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
  finishDurationMinutes?: number | null;

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
  commissionDeductionType?: ServiceCommissionType | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  commissionDeductionValue?: number | null;

  @ApiPropertyOptional({ enum: ServiceStatus })
  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;
}

export class ServiceStaffAssignmentDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number | null;

  @ApiPropertyOptional({ enum: ServiceCommissionType })
  @IsOptional()
  @IsEnum(ServiceCommissionType)
  commissionType?: ServiceCommissionType | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  commissionValue?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onlineBookingEnabled?: boolean;
}

export class ReplaceServiceStaffDto {
  @ApiProperty({ type: [ServiceStaffAssignmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceStaffAssignmentDto)
  staff!: ServiceStaffAssignmentDto[];
}

export class PatchServiceOnlineBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onlineBookingEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  calendarId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  customizePriceDisplay?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showPromptToCall?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireHomeAddress?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireCreditCard?: boolean;

  @ApiPropertyOptional({ enum: ServicePaymentRequirement })
  @IsOptional()
  @IsEnum(ServicePaymentRequirement)
  requirePaymentAtBooking?: ServicePaymentRequirement;
}

export class CreateResourceRequirementDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @ApiProperty({ enum: ServiceResourceType })
  @IsEnum(ServiceResourceType)
  resourceType!: ServiceResourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  resourceId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateResourceRequirementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label?: string;

  @ApiPropertyOptional({ enum: ServiceResourceType })
  @IsOptional()
  @IsEnum(ServiceResourceType)
  resourceType?: ServiceResourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  resourceId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ServiceProductUsageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string | null;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number | null;
}

export class ReplaceServiceProductsDto {
  @ApiProperty({ type: [ServiceProductUsageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceProductUsageDto)
  products!: ServiceProductUsageDto[];
}

export class CreateOptionGroupDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minSelections?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxSelections?: number | null;
}

export class UpdateOptionGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minSelections?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxSelections?: number | null;
}

export class CreateServiceOptionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  priceAdjustment?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  durationAdjustmentMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateServiceOptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  priceAdjustment?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  durationAdjustmentMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderIdsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}
