import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../constants';

/** Keyset pagination — use instead of page when scanning large tables. */
export class CursorPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Message/row id cursor' })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({
    enum: ['before', 'after'],
    default: 'before',
    description: 'before = older than cursor (chat history), after = newer',
  })
  @IsOptional()
  @IsIn(['before', 'after'])
  direction?: 'before' | 'after' = 'before';

  @ApiPropertyOptional({ default: DEFAULT_LIMIT, minimum: 1, maximum: MAX_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;
}
