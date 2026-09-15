import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StaffGender } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateMemberDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @ApiPropertyOptional({ enum: StaffGender })
  @IsOptional()
  @IsEnum(StaffGender)
  gender?: StaffGender;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isServiceProvider?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onlineBookingEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canAssignProductSales?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canManageWaitlist?: boolean;
}

export class UpdateMemberPermissionsDto {
  @ApiProperty({ type: 'object', additionalProperties: { type: 'boolean' } })
  @IsObject()
  permissions!: Record<string, boolean>;
}

export class UpdateMemberNotificationsDto {
  @ApiProperty({ type: 'object', additionalProperties: { type: 'boolean' } })
  @IsObject()
  notificationSettings!: Record<string, boolean>;
}

export class UpdateStaffCompensationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  serviceCommissionEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serviceCommissionMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  serviceCommissionPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  productCommissionEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  productCommissionPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  productCommissionOverridesEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hourlyEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  hourlyRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  greaterOfEnabled?: boolean;
}

export class StaffMemberServiceAssignmentDto {
  @ApiProperty()
  serviceId!: string;

  @ApiProperty()
  isEnabled!: boolean;

  @ApiPropertyOptional()
  durationMinutes?: number | null;

  @ApiPropertyOptional()
  price?: number | null;

  @ApiPropertyOptional()
  commissionType?: string | null;

  @ApiPropertyOptional()
  commissionValue?: number | null;

  @ApiPropertyOptional()
  onlineBookingEnabled?: boolean;
}

export class ReplaceStaffMemberServicesDto {
  @ApiProperty({ type: [StaffMemberServiceAssignmentDto] })
  assignments!: StaffMemberServiceAssignmentDto[];
}
