import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AppointmentSource,
  AppointmentStatus,
  CalendarLocationType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class ListAppointmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  calendarId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({
    description: 'Single status or comma-separated list',
    enum: AppointmentStatus,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class AppointmentServiceLineInputDto {
  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  price?: number;
}

export class CreateAppointmentDto {
  @ApiProperty()
  @IsUUID()
  calendarId!: string;

  @ApiProperty()
  @IsUUID()
  contactId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ type: [AppointmentServiceLineInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppointmentServiceLineInputDto)
  services?: AppointmentServiceLineInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty()
  @IsDateString()
  startAt!: string;

  @ApiProperty()
  @IsDateString()
  endAt!: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ enum: AppointmentSource })
  @IsOptional()
  @IsEnum(AppointmentSource)
  source?: AppointmentSource;

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
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Redeem one service from this client package on booking',
  })
  @IsOptional()
  @IsUUID()
  clientPackageId?: string;
}

export class UpdateAppointmentDto extends CreateAppointmentDto {}

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: AppointmentStatus })
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;
}

export class AppointmentServiceLineResponseDto {
  id!: string;
  serviceId!: string;
  assignedToId!: string | null;
  startAt!: Date | null;
  durationMinutes!: number | null;
  price!: string | null;
  sortOrder!: number;
  service!: { id: string; name: string; durationMinutes: number; price: string | null };
  assignedTo!: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

export class AppointmentUserSummaryDto {
  id!: string;
  firstName!: string | null;
  lastName!: string | null;
  email!: string;
}

export class AppointmentActivityItemDto {
  id!: string;
  action!: string;
  createdAt!: Date;
  actor!: AppointmentUserSummaryDto | null;
  metadata?: Record<string, unknown> | null;
}

export class AppointmentResponseDto {
  id!: string;
  businessId!: string;
  calendarId!: string;
  contactId!: string;
  serviceId!: string | null;
  workItemId!: string | null;
  assignedToId!: string | null;
  title!: string;
  description!: string | null;
  startAt!: Date;
  endAt!: Date;
  status!: AppointmentStatus;
  source!: AppointmentSource;
  locationType!: CalendarLocationType | null;
  locationValue!: string | null;
  notes!: string | null;
  externalProvider!: string | null;
  externalEventId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  calendar!: { id: string; name: string; color: string | null };
  contact!: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    email: string | null;
    phoneNumber: string | null;
    createdAt: Date;
  };
  service!: { id: string; name: string } | null;
  services!: AppointmentServiceLineResponseDto[];
  assignedTo!: AppointmentUserSummaryDto | null;
  createdBy!: AppointmentUserSummaryDto | null;
  relatedCheckoutId!: string | null;
  /** Set when internal save succeeded but Google sync failed */
  googleSyncWarning?: string | null;
}
