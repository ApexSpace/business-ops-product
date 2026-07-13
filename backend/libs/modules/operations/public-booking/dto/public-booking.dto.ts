import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentSource, StaffGender } from '@prisma/client';
import {
  Allow,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PublicBookingServiceLineDto {
  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  staffId?: string;
}

export class PublicBookingAvailabilityBaseQueryDto {
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

  @ApiPropertyOptional({
    description: 'Single service (legacy). Omit when serviceLines is provided.',
  })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional({
    description: 'When true, find slots for any eligible staff',
  })
  @IsOptional()
  @IsBoolean()
  anyone?: boolean;

  @ApiPropertyOptional({ enum: StaffGender })
  @IsOptional()
  @IsEnum(StaffGender)
  genderFilter?: StaffGender;

  @ApiPropertyOptional({
    description:
      'Multi-service lines: JSON string or Express-parsed bracket object. Validated in controller.',
  })
  @Allow()
  @IsOptional()
  serviceLines?: unknown;
}

export class PublicBookingAvailabilityQueryDto extends PublicBookingAvailabilityBaseQueryDto {}

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
  @IsBoolean()
  anyone?: boolean;

  @ApiPropertyOptional({ type: [PublicBookingServiceLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublicBookingServiceLineDto)
  serviceLines?: PublicBookingServiceLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bookedForFirstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bookedForLastName?: string;

  @ApiPropertyOptional({
    description: 'Email of the guest when booking for someone else',
  })
  @IsOptional()
  @IsString()
  @IsEmail()
  @MaxLength(255)
  bookedForEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  homeAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  policyAgreed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  reminderOptIn?: boolean;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  secondaryStaffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  offerCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentIntentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  holdToken?: string;
}

export class PublicBookingCheckoutDto {
  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  anyone?: boolean;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  customerName?: string;

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
  @IsBoolean()
  isEmbed?: boolean;
}

export class PublicBookingPhotoUploadDto {
  @ApiProperty()
  @IsUUID()
  appointmentId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(64)
  uploadToken!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  filename!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  mimeType!: string;

  @ApiProperty()
  @IsInt()
  size!: number;
}

export class PublicBookingAttachPhotosDto {
  @ApiProperty()
  @IsUUID()
  appointmentId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(64)
  uploadToken!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  fileIds!: string[];
}

export class JoinBookingWaitlistDto {
  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  additionalServiceIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  calendarId?: string;

  @ApiProperty()
  @IsISO8601()
  preferredDate!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  customerName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerFirstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerLastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneCountryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  preferredMorning?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  preferredAfternoon?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  preferredEvening?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;
}

export class PublicBookingChainedSlotLineDto {
  serviceId!: string;
  staffId!: string;
  startAt!: string;
  endAt!: string;
}

export class PublicBookingSlotDto {
  startAt!: string;
  endAt!: string;
  label!: string;
  available!: boolean;
  staffId?: string;
  serviceLines?: PublicBookingChainedSlotLineDto[];
}

export class PublicBookingDayAvailabilityDto {
  date!: string;
  slots!: PublicBookingSlotDto[];
}

export class PublicBookingFormSettingsDto {
  requireEmail!: boolean;
  requirePhone!: boolean;
  showNotes!: boolean;
  showBookForSomeoneElse!: boolean;
  cancellationPolicyText!: string | null;
  requirePolicyAgreement!: boolean;
}

export class PublicBookingRulesSummaryDto {
  minimumNoticeMinutes!: number;
  maxBookingDays!: number;
  allowMultipleServices!: boolean;
  allowDuplicateServices!: boolean;
  singleStaffOnly!: boolean;
  waitlistEnabled!: boolean;
}

export class PublicBookingBusinessDto {
  slug!: string;
  businessName!: string;
  title!: string;
  description!: string | null;
  timezone!: string;
  logoUrl!: string | null;
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
  giftCardUrl!: string | null;
  packageUrl!: string | null;
}

export class PublicBookingCatalogServiceDto {
  id!: string;
  name!: string;
  description!: string | null;
  price!: string | null;
  durationMinutes!: number;
  clientOccupancyMinutes!: number;
  categoryId!: string;
  categoryName!: string;
  requireHomeAddress!: boolean;
  paymentRequired!: boolean;
}

export class PublicBookingCatalogCategoryDto {
  id!: string;
  name!: string;
  services!: PublicBookingCatalogServiceDto[];
}

export class PublicBookingStaffDto {
  id!: string;
  name!: string;
  avatarUrl!: string | null;
  gender!: string | null;
  price!: string | null;
  durationMinutes!: number;
  clientOccupancyMinutes!: number;
  availabilityLabel!: string;
  isAnyone?: boolean;
}

export class PublicBookingConfirmationServiceLineDto {
  serviceId!: string;
  serviceName!: string;
  staffId!: string | null;
  staffName!: string | null;
  startAt!: string;
  endAt!: string;
  price!: string | null;
}

export class PublicBookingConfirmationDto {
  appointmentId!: string;
  title!: string;
  startAt!: string;
  endAt!: string;
  timezone!: string;
  status!: string;
  businessName!: string;
  serviceName!: string | null;
  staffName!: string | null;
  serviceLines!: PublicBookingConfirmationServiceLineDto[];
  confirmationMessage!: string;
  redirectUrl!: string | null;
  locationSummary!: string | null;
  collectPhotosEnabled!: boolean;
  photoUploadPrompt!: string | null;
  uploadToken!: string | null;
}

export class PublicBookingConflictDto {
  code!: string;
  message!: string;
  alternativeStaff!: PublicBookingStaffDto[];
  alternativeSlots!: PublicBookingSlotDto[];
}

/** @deprecated Use PublicBookingBusinessDto */
export class PublicBookingCalendarDto extends PublicBookingBusinessDto {
  name!: string;
  durationMinutes!: number;
  color!: string | null;
}
