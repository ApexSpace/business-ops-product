import { ApiProperty } from '@nestjs/swagger';
import { CalendarZoomLevel, DayOfWeek } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsString,
  Matches,
} from 'class-validator';

export class CalendarDisplaySettingsResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiProperty({ example: '07:00' })
  visibleStartTime!: string;

  @ApiProperty({ example: '22:00' })
  visibleEndTime!: string;

  @ApiProperty({ enum: DayOfWeek })
  weekStartsOn!: DayOfWeek;

  @ApiProperty({ enum: CalendarZoomLevel })
  zoomLevel!: CalendarZoomLevel;

  @ApiProperty()
  showNormalCancellation!: boolean;

  @ApiProperty()
  showLateCancellation!: boolean;

  @ApiProperty()
  showNoShow!: boolean;

  @ApiProperty()
  highContrastEnabled!: boolean;

  @ApiProperty()
  showBufferOnCalendar!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class UpdateVisibleHoursDto {
  @ApiProperty({ example: '07:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  visibleStartTime!: string;

  @ApiProperty({ example: '22:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$|^24:00$/)
  visibleEndTime!: string;
}

export class UpdateWeekStartDto {
  @ApiProperty({ enum: [DayOfWeek.SUNDAY, DayOfWeek.MONDAY] })
  @IsEnum(DayOfWeek)
  weekStartsOn!: DayOfWeek;
}

export class UpdateZoomLevelDto {
  @ApiProperty({ enum: CalendarZoomLevel })
  @IsEnum(CalendarZoomLevel)
  zoomLevel!: CalendarZoomLevel;
}

export class UpdateCancelledVisibilityDto {
  @ApiProperty()
  @IsBoolean()
  showNormalCancellation!: boolean;

  @ApiProperty()
  @IsBoolean()
  showLateCancellation!: boolean;

  @ApiProperty()
  @IsBoolean()
  showNoShow!: boolean;
}

export class UpdateHighContrastDto {
  @ApiProperty()
  @IsBoolean()
  highContrastEnabled!: boolean;
}
