import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpsertTimeCardBodyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  staffId?: string;

  @ApiPropertyOptional({ example: '2026-06-28' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: '14:06', description: 'HH:mm 24-hour' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  clockInTime?: string;

  @ApiPropertyOptional({ example: '15:00', description: 'HH:mm 24-hour' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  clockOutTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateTimeCardDto {
  @ApiProperty()
  @IsUUID('4')
  staffId!: string;

  @ApiProperty({ example: '2026-06-28' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: '14:06' })
  @Matches(/^\d{2}:\d{2}$/)
  clockInTime!: string;

  @ApiPropertyOptional({ example: '15:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  clockOutTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
