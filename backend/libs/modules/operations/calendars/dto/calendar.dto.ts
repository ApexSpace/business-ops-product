import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  CalendarLocationType,
  CalendarStatus,
  CalendarType,
  DayOfWeek,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class ListCalendarsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CalendarStatus })
  @IsOptional()
  @IsEnum(CalendarStatus)
  status?: CalendarStatus;
}

export class CreateCalendarDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: CalendarType })
  @IsOptional()
  @IsEnum(CalendarType)
  type?: CalendarType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional({ enum: CalendarStatus })
  @IsOptional()
  @IsEnum(CalendarStatus)
  status?: CalendarStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  defaultDurationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  bufferBeforeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  bufferAfterMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumNoticeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  maxBookingDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  slotIntervalMinutes?: number;

  @ApiPropertyOptional({ enum: CalendarLocationType })
  @IsOptional()
  @IsEnum(CalendarLocationType)
  locationType?: CalendarLocationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  locationValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoConfirm?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  formSettings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  confirmationSettings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  paymentSettings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  notificationSettings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  policySettings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  widgetSettings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  googleSyncSettings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  publicSlug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  publicBookingEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  embedEnabled?: boolean;
}

export class UpdateCalendarDto extends PartialType(CreateCalendarDto) {}

export class CalendarStaffUserDto {
  id!: string;
  firstName!: string | null;
  lastName!: string | null;
  email!: string;
}

export class CalendarStaffResponseDto {
  id!: string;
  calendarId!: string;
  userId!: string;
  role!: string | null;
  isPrimary!: boolean;
  user!: CalendarStaffUserDto;
}

export class CalendarAvailabilityResponseDto {
  id!: string;
  dayOfWeek!: DayOfWeek;
  startTime!: string;
  endTime!: string;
  isEnabled!: boolean;
}

export class CalendarExceptionResponseDto {
  id!: string;
  date!: string;
  startTime!: string | null;
  endTime!: string | null;
  isUnavailable!: boolean;
  reason!: string | null;
}

export class CalendarResponseDto {
  id!: string;
  businessId!: string;
  name!: string;
  description!: string | null;
  type!: CalendarType;
  color!: string | null;
  timezone!: string;
  status!: CalendarStatus;
  defaultDurationMinutes!: number;
  bufferBeforeMinutes!: number;
  bufferAfterMinutes!: number;
  minimumNoticeMinutes!: number;
  maxBookingDays!: number;
  slotIntervalMinutes!: number;
  locationType!: CalendarLocationType;
  locationValue!: string | null;
  requireApproval!: boolean;
  autoConfirm!: boolean;
  capacity!: number;
  formSettings!: Record<string, unknown> | null;
  confirmationSettings!: Record<string, unknown> | null;
  paymentSettings!: Record<string, unknown> | null;
  notificationSettings!: Record<string, unknown> | null;
  policySettings!: Record<string, unknown> | null;
  widgetSettings!: Record<string, unknown> | null;
  googleSyncSettings!: Record<string, unknown> | null;
  publicSlug!: string | null;
  publicBookingEnabled!: boolean;
  embedEnabled!: boolean;
  publicBookingUrl?: string | null;
  embedUrl?: string | null;
  embedCode?: string | null;
  staffCount?: number;
  appointmentCount?: number;
  createdAt!: Date;
  updatedAt!: Date;
}

export class CalendarDetailResponseDto extends CalendarResponseDto {
  staff!: CalendarStaffResponseDto[];
  availability!: CalendarAvailabilityResponseDto[];
  exceptions!: CalendarExceptionResponseDto[];
}

export class AvailabilitySlotDto {
  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @ApiProperty()
  @IsString()
  @MaxLength(5)
  startTime!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(5)
  endTime!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class ReplaceCalendarAvailabilityDto {
  @ApiProperty({ type: [AvailabilitySlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots!: AvailabilitySlotDto[];
}

export class AddCalendarStaffDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateCalendarExceptionDto {
  @ApiProperty()
  @IsString()
  date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5)
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5)
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isUnavailable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateCalendarExceptionDto extends CreateCalendarExceptionDto {}
