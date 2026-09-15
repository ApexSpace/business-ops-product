import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactPrintAppointmentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  startAt!: Date;

  @ApiProperty()
  endAt!: Date;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  serviceName?: string | null;

  @ApiPropertyOptional()
  providerName?: string | null;

  @ApiPropertyOptional()
  calendarName?: string | null;
}

export class ContactPrintAppointmentsResponseDto {
  @ApiProperty()
  businessName!: string;

  @ApiProperty()
  contactLabel!: string;

  @ApiPropertyOptional()
  contactPhone?: string | null;

  @ApiPropertyOptional()
  contactEmail?: string | null;

  @ApiProperty({ type: [ContactPrintAppointmentDto] })
  appointments!: ContactPrintAppointmentDto[];

  @ApiProperty()
  generatedAt!: Date;
}
