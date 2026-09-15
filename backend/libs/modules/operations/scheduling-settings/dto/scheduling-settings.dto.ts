import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class SchedulingSettingsResponseDto {
  @ApiProperty()
  slotIntervalMinutes!: number;

  @ApiProperty()
  bufferTimeEnabled!: boolean;

  @ApiProperty()
  bufferBeforeMinutes!: number;

  @ApiProperty()
  bufferAfterMinutes!: number;

  @ApiProperty()
  showBufferOnCalendar!: boolean;

  @ApiProperty()
  processingTimeEnabled!: boolean;

  @ApiProperty({ type: [Number] })
  rebookingJumpWeeks!: number[];
}

export class UpdateSchedulingSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  slotIntervalMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bufferTimeEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  bufferBeforeMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  bufferAfterMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showBufferOnCalendar?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  processingTimeEnabled?: boolean;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(12, { each: true })
  rebookingJumpWeeks?: number[];
}
