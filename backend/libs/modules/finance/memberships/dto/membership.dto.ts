import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ClientMembershipStatus,
  MembershipBillingIntervalUnit,
  MembershipCommissionBasis,
  MembershipPlanType,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class CreateMembershipPlanDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: MembershipPlanType })
  @IsEnum(MembershipPlanType)
  planType!: MembershipPlanType;
}

export class UpdatePlanDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  emoji?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  billingIntervalCount?: number;

  @ApiPropertyOptional({ enum: MembershipBillingIntervalUnit })
  @IsOptional()
  @IsEnum(MembershipBillingIntervalUnit)
  billingIntervalUnit?: MembershipBillingIntervalUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  chargeServiceTax?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === null ? null : Number(value)))
  servicesExpireAfterDays?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditAmount?: number | null;
}

export class ServiceGroupItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  groupPrice?: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  serviceIds!: string[];
}

export class UpdateServiceGroupsDto {
  @ApiProperty({ type: [ServiceGroupItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceGroupItemDto)
  groups!: ServiceGroupItemDto[];
}

export class UpdateDiscountsDto {
  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  productDiscountPercent!: number;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  serviceDiscountPercent!: number;
}

export class UpdateAgreementDto {
  @ApiProperty()
  @IsBoolean()
  requireAgreement!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agreementText?: string;
}

export class UpdatePlanOnlineSalesDto {
  @ApiProperty()
  @IsBoolean()
  availableOnline!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateAdvancedDto {
  @ApiProperty({ enum: MembershipCommissionBasis })
  @IsEnum(MembershipCommissionBasis)
  commissionBasis!: MembershipCommissionBasis;
}

export class ReorderMembershipPlansDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class CreateClientMembershipDto {
  @ApiProperty()
  @IsUUID('4')
  contactId!: string;

  @ApiProperty()
  @IsUUID('4')
  planId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;
}

export class ListClientMembershipsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: ClientMembershipStatus | 'all_except_canceled';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  planId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  showDifferentVersionsOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  showOlderUnpaid?: boolean;
}

export class UpdateClientMembershipDto {
  @ApiProperty()
  @IsString()
  action!:
    | 'pause'
    | 'resume'
    | 'cancel'
    | 'change_payment_method'
    | 'change_price_discounts'
    | 'add_extra_services'
    | 'renew_early';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  productDiscountPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  serviceDiscountPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  serviceGroupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class RedeemMembershipServiceDto {
  @ApiProperty()
  @IsUUID('4')
  serviceGroupId!: string;

  @ApiProperty()
  @IsUUID('4')
  saleLineItemId!: string;
}

export class UpdateMembershipPreferencesDto {
  @ApiProperty()
  @IsBoolean()
  allowClientCancel!: boolean;
}

export class UpdateMembershipSettingsOnlineSalesDto {
  @ApiProperty()
  @IsBoolean()
  onlineSalesEnabled!: boolean;
}

export class InitiateMembershipCheckoutDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  agreementAccepted?: boolean;
}

export class MembershipServiceGroupResponseDto {
  id!: string;
  quantity!: number;
  groupPrice!: string | null;
  sortOrder!: number;
  items!: Array<{
    serviceId: string;
    service: { id: string; name: string };
  }>;
}

export class MembershipPlanResponseDto {
  id!: string;
  name!: string;
  emoji!: string | null;
  planType!: MembershipPlanType;
  billingIntervalCount!: number;
  billingIntervalUnit!: MembershipBillingIntervalUnit;
  price!: string;
  chargeServiceTax!: boolean;
  servicesExpireAfter!: number | null;
  creditAmount!: string | null;
  productDiscountPercent!: string;
  serviceDiscountPercent!: string;
  requireAgreement!: boolean;
  agreementText!: string | null;
  availableOnline!: boolean;
  shortDescription!: string | null;
  description!: string | null;
  commissionBasis!: MembershipCommissionBasis;
  isArchived!: boolean;
  sortOrder!: number;
  serviceGroups!: MembershipServiceGroupResponseDto[];
  activeMembershipCount!: number;
  directLink!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ClientMembershipListItemResponseDto {
  id!: string;
  contact!: { id: string; name: string; email: string | null };
  plan!: { id: string; name: string; emoji: string | null; price: string };
  startDate!: Date;
  price!: string;
  status!: ClientMembershipStatus;
  billingIntervalUnit!: MembershipBillingIntervalUnit;
  nextBillingDate!: Date | null;
}

export class ClientMembershipDetailResponseDto extends ClientMembershipListItemResponseDto {
  currentPeriodStart!: Date | null;
  currentPeriodEnd!: Date | null;
  productDiscountPercent!: string;
  serviceDiscountPercent!: string;
  planVersion!: number;
  usageRecords!: Array<{
    id: string;
    serviceGroupId: string;
    totalSlots: number;
    usedSlots: number;
    expiresAt: Date | null;
    services: string[];
  }>;
  billingHistory!: Array<{
    id: string;
    eventType: string;
    amount: string | null;
    occurredAt: Date;
  }>;
}
