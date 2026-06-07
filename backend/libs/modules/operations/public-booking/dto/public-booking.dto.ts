import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentSource } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PublicBookingAvailabilityQueryDto {
  @ApiProperty()
  @IsISO8601()
  from!: string;

  @ApiProperty()
  @IsISO8601()
  to!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  staffId?: string;
}

export class CreatePublicBookingDto {
  @ApiProperty()
  @IsISO8601()
  startAt!: string;

  @ApiProperty()
  @IsISO8601()
  endAt!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  timezone!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  customerName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  customerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneCountryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  formAnswers?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: AppointmentSource })
  @IsOptional()
  @IsEnum(AppointmentSource)
  source?: AppointmentSource;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  referrer?: string;
}

export class PublicBookingSlotDto {
  startAt!: string;
  endAt!: string;
  label!: string;
  available!: boolean;
}

export class PublicBookingDayAvailabilityDto {
  date!: string;
  slots!: PublicBookingSlotDto[];
}

export class PublicBookingFormSettingsDto {
  requireEmail!: boolean;
  requirePhone!: boolean;
  showNotes!: boolean;
}

export class PublicBookingRulesSummaryDto {
  durationMinutes!: number;
  minimumNoticeMinutes!: number;
  maxBookingDays!: number;
  bufferBeforeMinutes!: number;
  bufferAfterMinutes!: number;
}

export class PublicBookingCalendarDto {
  slug!: string;
  name!: string;
  title!: string;
  description!: string | null;
  timezone!: string;
  durationMinutes!: number;
  businessName!: string;
  logoUrl!: string | null;
  color!: string | null;
  brandColor!: string | null;
  websiteUrl!: string | null;
  locationType!: string;
  locationSummary!: string | null;
  formSettings!: PublicBookingFormSettingsDto;
  confirmationMessage!: string;
  redirectUrl!: string | null;
  buttonText!: string;
  embedEnabled!: boolean;
  bookingRules!: PublicBookingRulesSummaryDto;
}

export class PublicBookingConfirmationDto {
  appointmentId!: string;
  title!: string;
  startAt!: string;
  endAt!: string;
  timezone!: string;
  status!: string;
  calendarName!: string;
  businessName!: string;
  confirmationMessage!: string;
  redirectUrl!: string | null;
  locationSummary!: string | null;
}
