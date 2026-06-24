import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ContactTimelineType } from './contact-timeline-query.dto';

export class ContactTimelineEventDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: ContactTimelineType;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  occurredAt!: Date;

  @ApiProperty()
  entityType!: string;

  @ApiProperty()
  entityId!: string;
}
