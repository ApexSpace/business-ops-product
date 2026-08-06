import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class CalendarQueryDto {
  @ApiProperty({ description: 'ISO 8601 range start' })
  @IsDateString()
  from!: string;

  @ApiProperty({ description: 'ISO 8601 range end' })
  @IsDateString()
  to!: string;
}
