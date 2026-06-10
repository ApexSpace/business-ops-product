import { ApiProperty } from '@nestjs/swagger';

export class PlatformBusinessStatsDto {
  @ApiProperty()
  total!: number;

  @ApiProperty()
  active!: number;

  @ApiProperty()
  notActive!: number;

  @ApiProperty()
  suspended!: number;

  @ApiProperty()
  archived!: number;
}

export class PlatformDashboardStatsDto {
  @ApiProperty()
  businesses!: PlatformBusinessStatsDto;

  @ApiProperty()
  platformUsers!: number;

  @ApiProperty()
  totalUsers!: number;

  @ApiProperty()
  contacts!: number;

  @ApiProperty()
  leads!: number;

  @ApiProperty()
  activeSubscriptions!: number;

  @ApiProperty()
  mrr!: string;
}
