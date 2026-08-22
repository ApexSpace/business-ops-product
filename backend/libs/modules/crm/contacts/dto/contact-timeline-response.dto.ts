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

  /** Primary line label for sale cards (e.g. service — with staff). */
  @ApiPropertyOptional()
  lineTitle?: string | null;

  @ApiPropertyOptional()
  amount?: string | null;

  @ApiPropertyOptional()
  subtotal?: string | null;

  @ApiPropertyOptional()
  total?: string | null;

  @ApiPropertyOptional()
  paymentSummary?: string | null;

  /** Normalized status for badges (e.g. closed, paid). */
  @ApiPropertyOptional()
  statusCode?: string | null;

  @ApiPropertyOptional()
  subtitle?: string | null;

  @ApiPropertyOptional()
  footer?: string | null;

  @ApiPropertyOptional()
  requested?: boolean | null;
}
