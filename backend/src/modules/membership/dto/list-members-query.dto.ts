import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListMembersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by email or name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
