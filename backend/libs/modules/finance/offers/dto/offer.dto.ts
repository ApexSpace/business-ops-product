import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DiscountAmountType,
  DiscountAppliesTo,
  DiscountScope,
  MembershipCommissionBasis,
  OfferApplicationMode,
  OfferMembershipScope,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class OfferDateRuleDto {
  @ApiProperty({
    enum: ['date_range', 'recurring_days', 'recurring_time_window'],
  })
  @IsString()
  type!: 'date_range' | 'recurring_days' | 'recurring_time_window';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  daysOfWeek?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endTime?: string;
}

export class CreateOfferDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class UpdateOfferDetailsDto {
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

  @ApiPropertyOptional({ enum: OfferApplicationMode })
  @IsOptional()
  @IsEnum(OfferApplicationMode)
  applicationMode?: OfferApplicationMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  offerCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoApptDateEnabled?: boolean;

  @ApiPropertyOptional({ type: [OfferDateRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferDateRuleDto)
  autoApptDateRules?: OfferDateRuleDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoBookingDateEnabled?: boolean;

  @ApiPropertyOptional({ type: [OfferDateRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferDateRuleDto)
  autoBookingDateRules?: OfferDateRuleDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoSaleDateEnabled?: boolean;

  @ApiPropertyOptional({ type: [OfferDateRuleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferDateRuleDto)
  autoSaleDateRules?: OfferDateRuleDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  minAmountEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  oncePerClient?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  newClientsOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  membershipRequired?: boolean;

  @ApiPropertyOptional({ enum: OfferMembershipScope })
  @IsOptional()
  @IsEnum(OfferMembershipScope)
  membershipScope?: OfferMembershipScope;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  specificMembershipPlanIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  specificProvidersEnabled?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  specificProviderIds?: string[];

  @ApiPropertyOptional({ enum: MembershipCommissionBasis })
  @IsOptional()
  @IsEnum(MembershipCommissionBasis)
  commissionBasis?: MembershipCommissionBasis;
}

export class CreateOfferDiscountDto {
  @ApiProperty({ enum: DiscountAppliesTo })
  @IsEnum(DiscountAppliesTo)
  appliesTo!: DiscountAppliesTo;

  @ApiProperty({ enum: DiscountAmountType })
  @IsEnum(DiscountAmountType)
  amountType!: DiscountAmountType;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ enum: DiscountScope })
  @IsOptional()
  @IsEnum(DiscountScope)
  serviceScope?: DiscountScope;

  @ApiPropertyOptional({ enum: DiscountScope })
  @IsOptional()
  @IsEnum(DiscountScope)
  productScope?: DiscountScope;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  specificServiceCategoryIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  specificServiceIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  specificProductCategoryIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  specificProductIds?: string[];
}

export class UpdateOfferDiscountDto extends CreateOfferDiscountDto {}

export class ReorderOffersDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class ReorderOfferDiscountsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}

export class ValidateOfferCodeDto {
  @ApiProperty()
  @IsString()
  @MaxLength(50)
  code!: string;
}

export class OfferUsageReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  offerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ApplyCheckoutOfferDto {
  @ApiProperty()
  @IsUUID('4')
  offerId!: string;
}

export class RemoveCheckoutOfferDto {
  @ApiProperty()
  @IsUUID('4')
  offerId!: string;
}

export class OfferDiscountResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: DiscountAppliesTo })
  appliesTo!: DiscountAppliesTo;

  @ApiProperty({ enum: DiscountAmountType })
  amountType!: DiscountAmountType;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ enum: DiscountScope })
  serviceScope!: DiscountScope;

  @ApiProperty({ enum: DiscountScope })
  productScope!: DiscountScope;

  @ApiPropertyOptional({ type: [String] })
  specificServiceCategoryIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  specificServiceIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  specificProductCategoryIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  specificProductIds?: string[];

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  summary!: string;

  @ApiProperty()
  subtext!: string;
}

export class OfferResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  isEnabled!: boolean;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ enum: OfferApplicationMode })
  applicationMode!: OfferApplicationMode;

  @ApiPropertyOptional()
  offerCode?: string | null;

  @ApiProperty()
  autoApptDateEnabled!: boolean;

  @ApiPropertyOptional({ type: [OfferDateRuleDto] })
  autoApptDateRules?: OfferDateRuleDto[] | null;

  @ApiProperty()
  autoBookingDateEnabled!: boolean;

  @ApiPropertyOptional({ type: [OfferDateRuleDto] })
  autoBookingDateRules?: OfferDateRuleDto[] | null;

  @ApiProperty()
  autoSaleDateEnabled!: boolean;

  @ApiPropertyOptional({ type: [OfferDateRuleDto] })
  autoSaleDateRules?: OfferDateRuleDto[] | null;

  @ApiProperty()
  minAmountEnabled!: boolean;

  @ApiPropertyOptional()
  minAmount?: string | null;

  @ApiProperty()
  oncePerClient!: boolean;

  @ApiProperty()
  newClientsOnly!: boolean;

  @ApiProperty()
  membershipRequired!: boolean;

  @ApiPropertyOptional({ enum: OfferMembershipScope })
  membershipScope?: OfferMembershipScope | null;

  @ApiPropertyOptional({ type: [String] })
  specificMembershipPlanIds?: string[] | null;

  @ApiProperty()
  specificProvidersEnabled!: boolean;

  @ApiPropertyOptional({ type: [String] })
  specificProviderIds?: string[] | null;

  @ApiProperty({ enum: MembershipCommissionBasis })
  commissionBasis!: MembershipCommissionBasis;

  @ApiProperty({ type: [OfferDiscountResponseDto] })
  discounts!: OfferDiscountResponseDto[];

  @ApiPropertyOptional()
  discountCount?: number;

  @ApiPropertyOptional()
  usageCount?: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
