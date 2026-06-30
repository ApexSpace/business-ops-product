import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessMemberRole, StaffGender } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateStaffMemberDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @ApiPropertyOptional({ enum: StaffGender })
  @IsOptional()
  @IsEnum(StaffGender)
  gender?: StaffGender;

  @ApiProperty({ enum: [BusinessMemberRole.ADMIN, BusinessMemberRole.MEMBER] })
  @IsIn([BusinessMemberRole.ADMIN, BusinessMemberRole.MEMBER])
  role!: BusinessMemberRole;

  @ApiPropertyOptional({ description: '4-digit time clock PIN' })
  @IsOptional()
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 numeric digits' })
  timeClockPin?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isServiceProvider?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canAssignProductSales?: boolean;
}
