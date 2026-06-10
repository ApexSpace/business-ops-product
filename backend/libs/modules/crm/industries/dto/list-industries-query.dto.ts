import { ApiPropertyOptional } from '@nestjs/swagger';
import { IndustryStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class ListIndustriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: IndustryStatus })
  @IsOptional()
  @IsEnum(IndustryStatus)
  status?: IndustryStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
