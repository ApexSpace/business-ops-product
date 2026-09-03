import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class QuickToolsDateRangeDto {
  @ApiProperty({ example: '2026-09-02', description: 'ISO date (YYYY-MM-DD)' })
  @IsDateString()
  fromDate!: string;

  @ApiPropertyOptional({
    example: '2026-09-05',
    description: 'ISO date (YYYY-MM-DD); defaults to fromDate',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class SetNotWorkingDto extends QuickToolsDateRangeDto {
  @ApiProperty({ type: [String], description: 'Staff user IDs to mark unavailable' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  staffUserIds!: string[];

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class RemoveNotWorkingDto extends QuickToolsDateRangeDto {
  @ApiProperty({ type: [String], description: 'Staff user IDs to clear full-day off blocks' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  staffUserIds!: string[];
}

export class QuickToolsSkippedDateDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty({ example: '2026-09-02' })
  date!: string;

  @ApiProperty({ example: 'partial_day_exists' })
  reason!: string;
}

export class QuickToolsAppointmentsByStaffDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  count!: number;
}

export class SetNotWorkingPreviewResponseDto {
  @ApiProperty()
  daysAffected!: number;

  @ApiProperty()
  exceptionsToCreate!: number;

  @ApiProperty({ type: [QuickToolsSkippedDateDto] })
  skipped!: QuickToolsSkippedDateDto[];

  @ApiProperty()
  appointmentCount!: number;

  @ApiProperty({ type: [QuickToolsAppointmentsByStaffDto] })
  appointmentsByStaff!: QuickToolsAppointmentsByStaffDto[];
}

export class SetNotWorkingApplyResponseDto {
  @ApiProperty()
  daysAffected!: number;

  @ApiProperty()
  exceptionsCreated!: number;

  @ApiProperty()
  skippedCount!: number;
}

export class RemoveNotWorkingPreviewResponseDto {
  @ApiProperty()
  daysAffected!: number;

  @ApiProperty()
  exceptionsToRemove!: number;

  @ApiProperty()
  appointmentCount!: number;

  @ApiProperty({ type: [QuickToolsAppointmentsByStaffDto] })
  appointmentsByStaff!: QuickToolsAppointmentsByStaffDto[];
}

export class RemoveNotWorkingApplyResponseDto {
  @ApiProperty()
  daysAffected!: number;

  @ApiProperty()
  exceptionsRemoved!: number;
}
