import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyPinResponseDto {
  @ApiProperty()
  staffId!: string;

  @ApiProperty()
  staffName!: string;

  @ApiProperty()
  isCurrentlyClockedIn!: boolean;

  @ApiPropertyOptional({ nullable: true })
  clockedInSince!: string | null;
}

export class ClockInResponseDto {
  @ApiProperty()
  staffName!: string;

  @ApiProperty()
  clockInTime!: string;

  @ApiProperty()
  message!: string;
}

export class ClockOutResponseDto {
  @ApiProperty()
  staffName!: string;

  @ApiProperty()
  clockOutTime!: string;

  @ApiProperty()
  paidMinutes!: number;

  @ApiProperty()
  paidHoursDisplay!: string;

  @ApiProperty()
  message!: string;
}
