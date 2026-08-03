import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, MaxLength } from 'class-validator';

export class ScheduleSocialPostDto {
  @ApiProperty({ description: 'ISO 8601 timestamp to publish at' })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ example: 'America/New_York' })
  @IsString()
  @MaxLength(100)
  timezone!: string;
}
