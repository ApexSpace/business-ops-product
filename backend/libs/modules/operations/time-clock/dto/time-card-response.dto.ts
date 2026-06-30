import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TimeCardStaffDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class TimeCardListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  day!: string;

  @ApiProperty()
  dayDisplay!: string;

  @ApiProperty({ type: TimeCardStaffDto })
  staff!: TimeCardStaffDto;

  @ApiProperty()
  clockInTime!: string;

  @ApiPropertyOptional({ nullable: true })
  clockOutTime!: string | null;

  @ApiPropertyOptional({ nullable: true })
  paidMinutes!: number | null;

  @ApiPropertyOptional({ nullable: true })
  paidHoursDisplay!: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;
}

export class TimeCardDetailDto extends TimeCardListItemDto {
  @ApiProperty()
  clockInTimeIso!: string;

  @ApiPropertyOptional({ nullable: true })
  clockOutTimeIso!: string | null;
}
