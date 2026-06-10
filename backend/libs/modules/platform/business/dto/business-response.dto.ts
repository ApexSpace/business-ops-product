import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BusinessStatus,
  SnapshotStatus,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { IndustryOptionDto } from '@app/modules/crm/industries/dto/industry.dto';
import { TaxesAndCurrencySettingsDto } from './financial-settings.dto';

export class BusinessResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  industryId?: string | null;

  @ApiPropertyOptional({ type: IndustryOptionDto })
  industry?: IndustryOptionDto | null;

  @ApiPropertyOptional()
  snapshotId?: string | null;

  @ApiPropertyOptional()
  snapshotName?: string | null;

  @ApiPropertyOptional({ enum: SnapshotStatus, nullable: true })
  snapshotStatus?: SnapshotStatus | null;

  @ApiPropertyOptional()
  snapshotAppliedAt?: Date | null;

  @ApiProperty({ enum: BusinessStatus })
  status!: BusinessStatus;

  @ApiPropertyOptional()
  firstName?: string | null;

  @ApiPropertyOptional()
  lastName?: string | null;

  @ApiPropertyOptional()
  displayName?: string | null;

  @ApiPropertyOptional()
  email?: string | null;

  @ApiPropertyOptional()
  phoneCountryCode?: string | null;

  @ApiPropertyOptional()
  phoneNumber?: string | null;

  @ApiPropertyOptional()
  address?: string | null;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiPropertyOptional()
  state?: string | null;

  @ApiPropertyOptional()
  country?: string | null;

  @ApiPropertyOptional()
  zip?: string | null;

  @ApiPropertyOptional()
  website?: string | null;

  @ApiPropertyOptional()
  timezone?: string | null;

  @ApiPropertyOptional()
  logoUrl?: string | null;

  @ApiPropertyOptional()
  addressLine2?: string | null;

  @ApiPropertyOptional({ type: TaxesAndCurrencySettingsDto })
  taxesAndCurrency?: TaxesAndCurrencySettingsDto;

  @ApiPropertyOptional()
  settings?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  createdById?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ enum: SubscriptionStatus })
  subscriptionStatus?: SubscriptionStatus | null;

  @ApiPropertyOptional()
  planTierName?: string | null;

  @ApiPropertyOptional()
  planTierId?: string | null;

  @ApiPropertyOptional({ enum: SubscriptionPaymentMethod })
  paymentMethod?: SubscriptionPaymentMethod | null;

  @ApiPropertyOptional({ enum: SubscriptionPaymentStatus })
  paymentStatus?: SubscriptionPaymentStatus | null;

  @ApiPropertyOptional()
  latestPaymentAt?: Date | null;

  @ApiPropertyOptional()
  recommendedActionKey?: string | null;

  @ApiPropertyOptional()
  currentPeriodEnd?: Date | null;

  @ApiPropertyOptional()
  planGroupName?: string | null;

  @ApiPropertyOptional()
  canAccessWorkspace?: boolean;

  @ApiPropertyOptional()
  reasonCode?: string;

  @ApiPropertyOptional()
  reasonLabel?: string;

  @ApiPropertyOptional({ type: [String] })
  needsAttention?: string[];
}
