import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  GiftCardSource,
  GiftCardStatus,
  GiftCardTransactionType,
} from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class ListGiftCardsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({
    description: 'When true, only active cards with remaining balance',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  redeemableOnly?: boolean;
}

export class CreateGiftCardManualDto {
  @ApiPropertyOptional({ description: 'Required when auto-generate is off' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  number?: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  initialValue!: number;

  @ApiProperty()
  @IsUUID()
  ownerContactId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchasingContactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateGiftCardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerContactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class AdjustGiftCardBalanceDto {
  @ApiProperty({ description: 'Positive or negative adjustment amount' })
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  note!: string;
}

export class CreateFromPosSaleDto {
  number?: string | null;
  initialValue!: number;
  ownerContactId!: string;
  purchasingContactId?: string | null;
  sendDigital?: boolean;
}

export class OnlinePurchaseMetadata {
  recipientEmail!: string;
  recipientName!: string;
  purchaserEmail!: string;
  purchaserName!: string;
  cardValue!: number;
  promotionId?: string | null;
  giftMessage?: string | null;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
}

export class GiftCardOnlineSalesShareResponseDto {
  slug?: string | null;
  onlineSalesEnabled!: boolean;
  stripeReady!: boolean;
  hostedPageUrl?: string | null;
  embedUrl?: string | null;
  embedCode?: string | null;
  iframeEmbed?: string | null;
}

export class EmbeddedGiftCardCheckoutResponseDto {
  clientSecret!: string;
  publishableKey!: string | null;
  stripeAccountId!: string;
  salePrice!: string;
  cardValue!: string;
}

export class UpdateGiftCardSettingsOnlineSalesDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  purchaseDisclaimer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, value) => value != null && String(value).trim() !== '')
  @IsEmail()
  internalNotifyEmail?: string;
}

export class UpdateGiftCardSettingsArtworkDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  artworkKey!: string;
}

export class UpdateGiftCardSettingsPreferencesDto {
  @ApiProperty()
  @IsBoolean()
  autoGenerateNumber!: boolean;
}

export class CreateGiftCardPromotionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  cardValue!: number;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  salePrice!: number;

  @ApiProperty()
  @IsString()
  startDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class UpdateGiftCardPromotionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  cardValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  salePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderGiftCardPromotionsDto {
  @ApiProperty({ type: [String] })
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}

export class OnlineGiftCardCheckoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  promotionId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o) => !o.promotionId)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  customAmount?: number;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  recipientName!: string;

  @ApiProperty()
  @IsEmail()
  recipientEmail!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  purchaserName!: string;

  @ApiProperty()
  @IsEmail()
  purchaserEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  giftMessage?: string;
}

export class RedeemGiftCardDto {
  @ApiProperty()
  @IsUUID()
  giftCardId!: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;
}

export class GiftCardContactSummaryDto {
  id!: string;
  name!: string;
  email?: string | null;
}

export class GiftCardTransactionResponseDto {
  id!: string;
  type!: GiftCardTransactionType;
  amount!: string;
  note?: string | null;
  invoiceId?: string | null;
  createdAt!: Date;
}

export class GiftCardListItemResponseDto {
  id!: string;
  number!: string;
  currentBalance!: string;
  initialValue!: string;
  status!: GiftCardStatus;
  source!: GiftCardSource;
  ownerContact!: GiftCardContactSummaryDto;
  purchasingContact?: GiftCardContactSummaryDto | null;
  createdAt!: Date;
}

export class GiftCardDetailResponseDto extends GiftCardListItemResponseDto {
  notes?: string | null;
  promotionId?: string | null;
  promotionName?: string | null;
  invoiceId?: string | null;
  artworkUrl?: string | null;
  transactions!: GiftCardTransactionResponseDto[];
}

export class GiftCardSettingsResponseDto {
  publicSlug?: string | null;
  onlineSalesEnabled!: boolean;
  purchaseDisclaimer?: string | null;
  selectedArtworkKey?: string | null;
  autoGenerateNumber!: boolean;
  internalNotifyEmail?: string | null;
  artworkPresets!: { key: string; label: string }[];
}

export class GiftCardPromotionResponseDto {
  id!: string;
  name!: string;
  description?: string | null;
  cardValue!: string;
  salePrice!: string;
  startDate!: Date;
  endDate?: Date | null;
  sortOrder!: number;
  isActive!: boolean;
}

export class GiftCardReportDateQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  asOfDate?: string;
}
