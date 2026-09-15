import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  WhatsAppTemplateCategory,
  WhatsAppTemplateStatus,
} from '@prisma/client';

export class WhatsAppTemplateListItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  language!: string;

  @ApiProperty({ enum: WhatsAppTemplateCategory })
  category!: WhatsAppTemplateCategory;

  @ApiProperty({ enum: WhatsAppTemplateStatus })
  status!: WhatsAppTemplateStatus;

  @ApiPropertyOptional({ nullable: true })
  bodyPreview!: string | null;

  @ApiPropertyOptional({ nullable: true })
  rejectionReason!: string | null;

  @ApiPropertyOptional({ nullable: true })
  metaTemplateId!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  lastSyncedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class WhatsAppTemplateDetailResponseDto extends WhatsAppTemplateListItemResponseDto {
  @ApiProperty()
  wabaId!: string;

  @ApiProperty()
  parameterFormat!: string;

  @ApiProperty()
  components!: unknown;

  @ApiPropertyOptional({ nullable: true })
  qualityScore!: unknown;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  submittedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty()
  canSend!: boolean;

  @ApiProperty()
  canEdit!: boolean;

  @ApiProperty()
  canDelete!: boolean;

  @ApiPropertyOptional({ nullable: true })
  editBlockedReason!: string | null;
}

export class WhatsAppTemplateOptionsResponseDto {
  @ApiProperty()
  languages!: Array<{ code: string; label: string }>;

  @ApiProperty()
  categories!: Array<{
    value: WhatsAppTemplateCategory;
    label: string;
    description: string;
  }>;

  @ApiProperty()
  buttonTypes!: Array<{ value: string; label: string }>;

  @ApiProperty()
  headerFormats!: string[];
}

export class WhatsAppTemplateSyncResponseDto {
  @ApiProperty()
  syncedCount!: number;
}
