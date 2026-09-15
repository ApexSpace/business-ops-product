import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntegrationResourceStatus } from '@prisma/client';

export class WhatsAppNumberResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  phoneNumber!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional({ nullable: true })
  messagingLimit!: string | null;

  @ApiPropertyOptional({ nullable: true })
  qualityRating!: string | null;

  @ApiProperty({ enum: IntegrationResourceStatus })
  status!: IntegrationResourceStatus;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  lastSyncedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  wabaId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  wabaName!: string | null;

  @ApiProperty()
  isDefault!: boolean;
}

export class WhatsAppOverviewResponseDto {
  @ApiProperty()
  connected!: boolean;

  @ApiPropertyOptional()
  integrationStatus?: string;

  @ApiPropertyOptional({ nullable: true })
  connectedAccountName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  wabaId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  wabaName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  defaultPhoneNumber?: string | null;

  @ApiPropertyOptional({ type: WhatsAppNumberResponseDto, nullable: true })
  defaultNumber?: WhatsAppNumberResponseDto | null;
}
