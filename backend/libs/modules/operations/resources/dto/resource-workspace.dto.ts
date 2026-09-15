import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ResourceListItemResponseDto } from './resource.dto';

export class ResourceAvailabilitySlotDto {
  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @ApiProperty()
  @IsString()
  @MaxLength(8)
  startTime!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(8)
  endTime!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class ReplaceResourceAvailabilityDto {
  @ApiProperty({ type: [ResourceAvailabilitySlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceAvailabilitySlotDto)
  slots!: ResourceAvailabilitySlotDto[];
}

export class ResourceAvailabilityResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: DayOfWeek })
  dayOfWeek!: DayOfWeek;

  @ApiProperty()
  startTime!: string;

  @ApiProperty()
  endTime!: string;

  @ApiProperty()
  isEnabled!: boolean;
}

export class CreateResourceScheduleExceptionDto {
  @ApiProperty()
  @IsDateString()
  date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8)
  startTime?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8)
  endTime?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isUnavailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}

export class ResourceScheduleExceptionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  date!: string;

  @ApiPropertyOptional()
  startTime?: string | null;

  @ApiPropertyOptional()
  endTime?: string | null;

  @ApiProperty()
  isUnavailable!: boolean;

  @ApiPropertyOptional()
  reason?: string | null;
}

export class LinkedServiceResponseDto {
  @ApiProperty()
  serviceId!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  requirementId!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  source!: 'service' | 'service_option';

  @ApiPropertyOptional()
  optionName?: string | null;
}

export class ResourceWorkspaceResponseDto {
  @ApiProperty({ type: ResourceListItemResponseDto })
  resource!: ResourceListItemResponseDto;

  @ApiProperty({ type: [ResourceAvailabilityResponseDto] })
  availability!: ResourceAvailabilityResponseDto[];

  @ApiProperty({ type: [ResourceScheduleExceptionResponseDto] })
  scheduleExceptions!: ResourceScheduleExceptionResponseDto[];

  @ApiProperty({ type: [LinkedServiceResponseDto] })
  linkedServices!: LinkedServiceResponseDto[];
}
