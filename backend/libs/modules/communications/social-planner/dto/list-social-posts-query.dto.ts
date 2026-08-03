import { ApiPropertyOptional } from '@nestjs/swagger';
import { SocialPostStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class ListSocialPostsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SocialPostStatus })
  @IsOptional()
  @IsEnum(SocialPostStatus)
  status?: SocialPostStatus;

  @ApiPropertyOptional({ example: 'facebook' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  providerKey?: string;

  @ApiPropertyOptional({ description: 'Filter scheduledAt >= this ISO date' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Filter scheduledAt <= this ISO date' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
