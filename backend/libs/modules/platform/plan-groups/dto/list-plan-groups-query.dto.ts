import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanGroupStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class ListPlanGroupsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PlanGroupStatus })
  @IsOptional()
  @IsEnum(PlanGroupStatus)
  status?: PlanGroupStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
