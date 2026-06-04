import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class ListMessagesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Keyset cursor (message id). When set, page is ignored.',
  })
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @ApiPropertyOptional({
    enum: ['before', 'after'],
    default: 'before',
    description: 'before = older messages (scroll up), after = newer',
  })
  @IsOptional()
  @IsIn(['before', 'after'])
  direction?: 'before' | 'after' = 'before';

  @ApiPropertyOptional({
    description: 'When true with no cursor, returns the latest messages first (chat mode).',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  latest?: boolean;
}
