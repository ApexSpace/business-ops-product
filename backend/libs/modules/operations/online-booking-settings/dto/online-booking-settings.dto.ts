import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  AnyoneAssignmentMode,
  CalendarLocationType,
  DayOfWeek,
  GapEmptyDayMode,
  GapMultiProviderMode,
  GapTimeBlockMode,
} from '@prisma/client';

export class UpdateOnlineBookingSetupDto {
  @ApiProperty()
  @IsBoolean()
  onlineBookingEnabled!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  embedEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  overlayEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  widgetSettings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  confirmationSettings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  formSettings?: Record<string, unknown>;
}

export class UpdateOnlineBookingPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10080)
  minimumNoticeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  maxBookingDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  avoidGapsEnabled?: boolean;

  @ApiPropertyOptional({
    description:
      'Maximum allowed gap in minutes. 0 = adjacent only. Null = no limit.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(480)
  avoidGapsMaxGapMinutes?: number | null;

  @ApiPropertyOptional({
    description: 'Minimum allowed gap in minutes. Null = no minimum.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(480)
  avoidGapsMinGapMinutes?: number | null;

  @ApiPropertyOptional({ enum: GapTimeBlockMode })
  @IsOptional()
  @IsEnum(GapTimeBlockMode)
  avoidGapsTimeBlockMode?: GapTimeBlockMode;

  @ApiPropertyOptional({ enum: GapEmptyDayMode })
  @IsOptional()
  @IsEnum(GapEmptyDayMode)
  avoidGapsEmptyDayMode?: GapEmptyDayMode;

  @ApiPropertyOptional({ enum: GapMultiProviderMode })
  @IsOptional()
  @IsEnum(GapMultiProviderMode)
  avoidGapsMultiProviderMode?: GapMultiProviderMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowMultipleServices?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowDuplicateServices?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  singleStaffOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  collectPhotosEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUploadPrompt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  waitlistEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  expressBookingEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  expressBookingAutoEnable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  expressBookingTimeLimitMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  expressRequireCard?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  expressRequireDeposit?: boolean;

  @ApiPropertyOptional({ enum: ['FULL', 'PERCENTAGE', 'FIXED'] })
  @IsOptional()
  @IsString()
  expressDepositType?: 'FULL' | 'PERCENTAGE' | 'FIXED';

  @ApiPropertyOptional()
  @IsOptional()
  expressDepositAmount?: number | string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  expressAllowPhotoUpload?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  cancellationPolicyVersion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  slotIntervalMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  bufferBeforeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  bufferAfterMinutes?: number;

  @ApiPropertyOptional({
    description:
      'Deprecated — ignored. Scheduling uses the business profile timezone.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoConfirm?: boolean;

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
  @IsObject()
  formSettings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  notificationSettings?: Record<string, unknown>;
}

export class UpdateOnlineBookingStaffSelectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  randomizeStaffOrder?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showGenderOptions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showAnyoneOption?: boolean;

  @ApiPropertyOptional({ enum: AnyoneAssignmentMode })
  @IsOptional()
  @IsEnum(AnyoneAssignmentMode)
  anyoneAssignmentMode?: AnyoneAssignmentMode;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  anyoneExcludedStaffIds?: string[];
}

export class BusinessHoursSlotDto {
  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime!: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime!: string;

  @ApiProperty()
  @IsBoolean()
  isEnabled!: boolean;
}

export class ReplaceBusinessHoursDto {
  @ApiProperty({ type: [BusinessHoursSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursSlotDto)
  slots!: BusinessHoursSlotDto[];
}

export class StaffWorkScheduleResponseDto {
  @ApiProperty()
  useBusinessHours!: boolean;

  @ApiProperty({ type: [BusinessHoursSlotDto] })
  slots!: BusinessHoursSlotDto[];
}

export class ReplaceStaffWorkScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  useBusinessHours?: boolean;

  @ApiPropertyOptional({ type: [BusinessHoursSlotDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursSlotDto)
  slots?: BusinessHoursSlotDto[];
}

export class OnlineBookingSettingsResponseDto {
  id!: string;
  businessId!: string;
  publicSlug!: string | null;
  onlineBookingEnabled!: boolean;
  publicBookingUrl!: string | null;
  embedUrl!: string | null;
  embedCode!: string | null;
  overlayUrl!: string | null;
  embedEnabled!: boolean;
  overlayEnabled!: boolean;
  minimumNoticeMinutes!: number;
  maxBookingDays!: number;
  avoidGapsEnabled!: boolean;
  avoidGapsMaxGapMinutes!: number | null;
  avoidGapsMinGapMinutes!: number | null;
  avoidGapsTimeBlockMode!: string;
  avoidGapsEmptyDayMode!: string;
  avoidGapsMultiProviderMode!: string;
  allowMultipleServices!: boolean;
  allowDuplicateServices!: boolean;
  singleStaffOnly!: boolean;
  collectPhotosEnabled!: boolean;
  photoUploadPrompt!: string | null;
  waitlistEnabled!: boolean;
  expressBookingEnabled!: boolean;
  expressBookingAutoEnable!: boolean;
  expressBookingTimeLimitMinutes!: number;
  expressRequireCard!: boolean;
  expressRequireDeposit!: boolean;
  expressDepositType!: string;
  expressDepositAmount!: string | null;
  expressAllowPhotoUpload!: boolean;
  cancellationPolicyVersion!: string;
  randomizeStaffOrder!: boolean;
  showGenderOptions!: boolean;
  showAnyoneOption!: boolean;
  anyoneAssignmentMode!: string;
  anyoneExcludedStaffIds!: string[];
  slotIntervalMinutes!: number;
  bufferBeforeMinutes!: number;
  bufferAfterMinutes!: number;
  timezone!: string;
  locationType!: string;
  locationValue!: string | null;
  requireApproval!: boolean;
  autoConfirm!: boolean;
  formSettings!: Record<string, unknown>;
  confirmationSettings!: Record<string, unknown>;
  widgetSettings!: Record<string, unknown>;
  notificationSettings!: Record<string, unknown>;
}
