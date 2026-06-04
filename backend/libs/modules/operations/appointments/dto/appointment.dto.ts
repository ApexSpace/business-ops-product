import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AppointmentSource,
  AppointmentStatus,
  CalendarLocationType,
} from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
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

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

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
}

export class UpdateAppointmentDto extends CreateAppointmentDto {}

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: AppointmentStatus })
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;
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
  };
  service!: { id: string; name: string } | null;
  assignedTo!: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  /** Set when internal save succeeded but Google sync failed */
  googleSyncWarning?: string | null;
}
