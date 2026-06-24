import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export const CONTACT_TIMELINE_TYPES = [
  'contact_created',
  'appointment',
  'note',
  'sale',
  'form',
  'lead',
  'work_item',
  'task',
] as const;

export type ContactTimelineType = (typeof CONTACT_TIMELINE_TYPES)[number];

export class ContactTimelineQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    type: [String],
    enum: CONTACT_TIMELINE_TYPES,
    description: 'Filter by event types',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(CONTACT_TIMELINE_TYPES, { each: true })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    return Array.isArray(value) ? value : [value];
  })
  types?: ContactTimelineType[];
}
