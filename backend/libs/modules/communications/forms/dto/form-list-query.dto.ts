import { ApiPropertyOptional } from '@nestjs/swagger';
import { FormStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

const LIST_SORT_FIELDS = ['name', 'updatedAt', 'createdAt', 'status'] as const;

export type FormListSortField = (typeof LIST_SORT_FIELDS)[number];

export class FormListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: FormStatus })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const upper = value.toUpperCase();
    if (upper === 'ALL') return undefined;
    return upper;
  })
  @IsEnum(FormStatus)
  status?: FormStatus;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}
