import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export enum TimeCardTimePeriod {
  ALL = 'all',
  TODAY = 'today',
  THIS_WEEK = 'this_week',
  THIS_MONTH = 'this_month',
  CUSTOM = 'custom',
}

export enum TimeCardSortBy {
  DAY = 'day',
  STAFF = 'staff',
}

export class ListTimeCardsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  staffId?: string;

  @ApiPropertyOptional({ enum: TimeCardTimePeriod })
  @IsOptional()
  @IsEnum(TimeCardTimePeriod)
  timePeriod?: TimeCardTimePeriod;

  @ApiPropertyOptional({
    description: 'ISO date (YYYY-MM-DD), used with custom period',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'ISO date (YYYY-MM-DD), used with custom period',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
