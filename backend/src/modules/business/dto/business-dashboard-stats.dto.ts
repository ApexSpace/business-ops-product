import { ApiProperty } from '@nestjs/swagger';

class LeadStatsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  won!: number;

  @ApiProperty()
  lost!: number;

  @ApiProperty()
  archived!: number;
}

export class BusinessDashboardStatsDto {
  @ApiProperty()
  contacts!: number;

  @ApiProperty({ type: LeadStatsDto })
  leads!: LeadStatsDto;

  @ApiProperty()
  pipelines!: number;

  @ApiProperty()
  appointments!: number;

  @ApiProperty()
  conversations!: number;

  @ApiProperty()
  members!: number;
}
