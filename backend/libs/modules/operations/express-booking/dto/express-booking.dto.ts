import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateExpressAppointmentDto {
  @ApiPropertyOptional({
    description:
      'Existing contact. Mutually exclusive with guest first name + destination (email or phone).',
  })
  @ValidateIf((o: CreateExpressAppointmentDto) => !o.guestFirstName)
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({ example: 'Alex' })
  @ValidateIf((o: CreateExpressAppointmentDto) => !o.contactId)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  guestFirstName?: string;

  @ApiPropertyOptional({
    example: 'alex@example.com',
    description: 'Required when sending the completion link by email',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  guestEmail?: string;

  @ApiPropertyOptional({
    description: 'Required when sending the completion link by SMS',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  guestPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8)
  guestPhoneCountryCode?: string;

  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiProperty()
  @IsDateString()
  startAt!: string;

  @ApiPropertyOptional({
    description: 'Optional end time; defaults to service duration from startAt',
  })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiProperty({ description: 'Pre-assigned staff from the calendar column' })
  @IsUUID()
  assignedToId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  calendarId?: string | null;

  @ApiPropertyOptional({ description: 'Per-appointment override' })
  @IsOptional()
  @IsBoolean()
  expressRequireCard?: boolean;

  @ApiPropertyOptional({ description: 'Per-appointment override' })
  @IsOptional()
  @IsBoolean()
  expressRequireDeposit?: boolean;

  @ApiPropertyOptional({ description: 'Per-appointment time limit override' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  expressTimeLimitMinutes?: number;
}

export class ExpressCompleteDto {
  @ApiPropertyOptional({
    description: 'Required for guest path; ignored when appointment has contactId',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerLastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  customerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8)
  phoneCountryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Optional staff switch from the pre-assigned provider',
  })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

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
  @IsString()
  paymentIntentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  setupIntentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  holdToken?: string;
}

export class ExpressCheckoutDto {
  @ApiPropertyOptional({
    description: 'Required for guest when resolving contact for payment',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  customerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8)
  phoneCountryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
