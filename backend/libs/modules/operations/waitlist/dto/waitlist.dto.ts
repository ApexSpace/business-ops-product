import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BookingWaitlistSource,
  BookingWaitlistStatus,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';
import { PublicBookingSlotDto } from '@app/modules/operations/public-booking/dto/public-booking.dto';

function emptyToUndefined({ value }: { value: unknown }) {
  return value === '' || value === null ? undefined : value;
}

export class ListWaitlistQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BookingWaitlistStatus })
  @IsOptional()
  @IsEnum(BookingWaitlistStatus)
  status?: BookingWaitlistStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  staffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  calendarId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  preferredDate?: string;

  @ApiPropertyOptional({
    description: 'When true, only entries with available openings',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true' || value === '1') return true;
    if (value === false || value === 'false' || value === '0') return false;
    return value;
  })
  @IsBoolean()
  hasOpening?: boolean;
}

export class CreateWaitlistEntryDto {
  @ApiProperty()
  @IsUUID()
  contactId!: string;

  @ApiProperty()
  @IsUUID()
  serviceId!: string;

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

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  additionalServiceIds?: string[];
}

export class BookFromWaitlistDto {
  @ApiProperty()
  @IsISO8601()
  startAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  calendarId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  staffId?: string;
}

export class WaitlistContactDto {
  id!: string;
  name!: string;
  email?: string | null;
  phone?: string | null;
}

export class WaitlistServiceDto {
  id!: string;
  name!: string;
  durationMinutes!: number;
  price?: number | null;
}

export class WaitlistStaffDto {
  id!: string;
  name!: string;
}

export class WaitlistEntryResponseDto {
  id!: string;
  businessId!: string;
  calendarId?: string | null;
  calendarName?: string | null;
  contact!: WaitlistContactDto;
  service!: WaitlistServiceDto;
  additionalServiceIds!: string[];
  staff?: WaitlistStaffDto | null;
  preferredDate!: string;
  preferredMorning!: boolean;
  preferredAfternoon!: boolean;
  preferredEvening!: boolean;
  comments?: string | null;
  status!: BookingWaitlistStatus;
  source!: BookingWaitlistSource;
  matchedOpenings!: PublicBookingSlotDto[];
  hasOpening!: boolean;
  createdAt!: string;
  updatedAt!: string;
}

export class WaitlistSummaryDto {
  matchedCount!: number;
  waitingCount!: number;
}

export class WaitlistBookResultDto {
  entry!: WaitlistEntryResponseDto;
  appointmentId!: string;
}
