import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ClientPackageSource,
  ClientPackageStatus,
  PackageCommissionBasis,
  PackageExpirationPolicy,
  PackageHistoryEventType,
  PackageServiceGroupQuantityType,
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
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class CreatePackageTemplateDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  emoji?: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalPrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  chargeTax?: boolean;

  @ApiPropertyOptional({ enum: PackageExpirationPolicy })
  @IsOptional()
  @IsEnum(PackageExpirationPolicy)
  expirationPolicy?: PackageExpirationPolicy;

  @ApiPropertyOptional({
    description: 'Required when expirationPolicy is AFTER_PURCHASE',
  })
  @ValidateIf(
    (o: CreatePackageTemplateDto) =>
      o.expirationPolicy === PackageExpirationPolicy.AFTER_PURCHASE,
  )
  @IsInt()
  @Min(1)
  expirationDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onlineSalesEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requireAgreement?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agreementText?: string;

  @ApiPropertyOptional({ enum: PackageCommissionBasis })
  @IsOptional()
  @IsEnum(PackageCommissionBasis)
  commissionBasis?: PackageCommissionBasis;
}

export class UpdatePackageTemplateDto extends CreatePackageTemplateDto {}

export class ReorderPackageTemplatesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class CreateServiceGroupDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  serviceIds!: string[];

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ enum: PackageServiceGroupQuantityType })
  @IsOptional()
  @IsEnum(PackageServiceGroupQuantityType)
  quantityType?: PackageServiceGroupQuantityType;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  groupPrice!: number;
}

export class UpdateServiceGroupDto extends CreateServiceGroupDto {}

export class ListClientPackagesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class AvailableClientPackagesQueryDto {
  @ApiProperty()
  @IsUUID()
  contactId!: string;

  @ApiProperty()
  @IsUUID()
  serviceId!: string;
}

export class CreateClientPackageDto {
  @ApiProperty()
  @IsUUID()
  contactId!: string;

  @ApiProperty()
  @IsUUID()
  packageTemplateId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expirationDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;
}

export class TransferPackageDto {
  @ApiProperty()
  @IsUUID()
  targetContactId!: string;
}

export class AllocationAdjustmentDto {
  @ApiProperty()
  @IsUUID()
  serviceId!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  remaining!: number;
}

export class AdjustQuantitiesDto {
  @ApiProperty({ type: [AllocationAdjustmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllocationAdjustmentDto)
  allocations!: AllocationAdjustmentDto[];
}

export class UpdateExpirationDateDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @IsDateString()
  expirationDate?: string | null;
}

export class UpdatePackageSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  onlineSalesEnabled?: boolean;
}

export class InitiatePackageCheckoutDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class PackageContactSummaryDto {
  id!: string;
  name!: string;
  email!: string | null;
}

export class PackageServiceSummaryDto {
  id!: string;
  name!: string;
}

export class PackageServiceGroupItemResponseDto {
  serviceId!: string;
  service!: PackageServiceSummaryDto;
}

export class PackageServiceGroupResponseDto {
  id!: string;
  quantity!: number;
  quantityType!: PackageServiceGroupQuantityType;
  groupPrice!: string;
  sortOrder!: number;
  items!: PackageServiceGroupItemResponseDto[];
}

export class PackageTemplateResponseDto {
  id!: string;
  name!: string;
  emoji!: string | null;
  totalPrice!: string;
  chargeTax!: boolean;
  expirationPolicy!: PackageExpirationPolicy;
  expirationDays!: number | null;
  onlineSalesEnabled!: boolean;
  shortDescription!: string | null;
  description!: string | null;
  requireAgreement!: boolean;
  agreementText!: string | null;
  commissionBasis!: PackageCommissionBasis;
  sortOrder!: number;
  serviceGroups!: PackageServiceGroupResponseDto[];
  directLink?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PackageHistoryEventResponseDto {
  id!: string;
  eventType!: PackageHistoryEventType;
  description!: string | null;
  quantityChange!: number | null;
  serviceId!: string | null;
  createdAt!: Date;
}

export class PackageServiceAllocationResponseDto {
  serviceId!: string;
  serviceName!: string;
  remaining!: number;
  initialQty!: number;
}

export class ClientPackageListItemResponseDto {
  id!: string;
  contact!: PackageContactSummaryDto;
  packageTemplate!: {
    id: string;
    name: string;
    emoji: string | null;
    totalPrice: string;
  };
  totalQty!: number;
  purchaseDate!: Date;
  expirationDate!: Date | null;
  status!: ClientPackageStatus;
  source!: ClientPackageSource;
  isDemo!: boolean;
}

export class ClientPackageDetailResponseDto extends ClientPackageListItemResponseDto {
  serviceAllocations!: PackageServiceAllocationResponseDto[];
  history!: PackageHistoryEventResponseDto[];
  stripePaymentIntentId!: string | null;
}

export class PackageSettingsResponseDto {
  onlineSalesEnabled!: boolean;
  publicSlug!: string | null;
  shareableLink!: string | null;
  embedScript!: string | null;
  overlayLink!: string | null;
  stripeReady!: boolean;
}

export class PublicPackageCheckoutDto {
  business!: { id: string; name: string };
  package!: {
    id: string;
    name: string;
    emoji: string | null;
    totalPrice: string;
    shortDescription: string | null;
    description: string | null;
    requireAgreement: boolean;
    agreementText: string | null;
    serviceGroups: PackageServiceGroupResponseDto[];
  };
  stripeReady!: boolean;
}
