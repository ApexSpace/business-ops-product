import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';
import { PublicBookingDayAvailabilityDto } from './public-booking.dto';

export class PublicAppointmentManageSummaryDto {
  @ApiProperty()
  businessName!: string;

  @ApiProperty()
  businessPhone!: string | null;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  serviceName!: string | null;

  @ApiProperty()
  staffName!: string | null;

  @ApiProperty()
  startAt!: string;

  @ApiProperty()
  endAt!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  canCancel!: boolean;

  @ApiProperty()
  canReschedule!: boolean;

  @ApiProperty()
  cancellationPolicyHtml!: string | null;

  @ApiProperty()
  cancellationPolicySms!: string | null;
}

export class PublicAppointmentManageAvailabilityQueryDto {
  @ApiProperty()
  @IsISO8601()
  from!: string;

  @ApiProperty()
  @IsISO8601()
  to!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class PublicAppointmentRescheduleDto {
  @ApiProperty()
  @IsISO8601()
  startAt!: string;

  @ApiProperty()
  @IsISO8601()
  endAt!: string;
}

export class PublicAppointmentManageAvailabilityDto {
  @ApiProperty({ type: [PublicBookingDayAvailabilityDto] })
  days!: PublicBookingDayAvailabilityDto[];
}
