import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceLineType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CheckoutItemInputDto {
  @ApiPropertyOptional({ enum: InvoiceLineType, default: InvoiceLineType.SERVICE })
  @IsOptional()
  @IsEnum(InvoiceLineType)
  lineType?: InvoiceLineType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  serviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  staffUserId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity!: number;

  @ApiProperty({ example: 30 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice!: number;
}

export class CreateCheckoutDto {
  @ApiProperty()
  @IsUUID('4')
  contactId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({ type: [CheckoutItemInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemInputDto)
  items?: CheckoutItemInputDto[];
}

export class UpdateCheckoutDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  taxAmount?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ type: [CheckoutItemInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemInputDto)
  items?: CheckoutItemInputDto[];
}

export class AddCheckoutServiceDto {
  @ApiProperty()
  @IsUUID('4')
  serviceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  staffUserId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity?: number;
}

export class AddCheckoutProductDto {
  @ApiProperty()
  @IsUUID('4')
  productId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  variantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  staffUserId?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity?: number;
}

export class AddWalletDepositDto {
  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;
}

export class AddGiftCardLineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  number?: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty()
  @IsUUID('4')
  ownerContactId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sendDigital?: boolean;
}

export class AddPackageLineDto {
  @ApiProperty()
  @IsUUID('4')
  packageTemplateId!: string;

  @ApiProperty()
  @IsUUID('4')
  ownerContactId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;
}

export class UpdateCheckoutLineItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID('4')
  staffUserId?: string | null;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;
}
