import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductVariantStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProductVariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  compareAtPrice?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchaseCost?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  desiredQuantity?: number | null;

  @ApiPropertyOptional({ enum: ProductVariantStatus })
  @IsOptional()
  @IsEnum(ProductVariantStatus)
  status?: ProductVariantStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customAttributes?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ProductVariantOptionValueResponseDto {
  @ApiProperty()
  optionId!: string;

  @ApiProperty()
  optionName!: string;

  @ApiProperty()
  optionValueId!: string;

  @ApiProperty()
  value!: string;
}

export class ProductVariantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  variantKey!: string;

  @ApiPropertyOptional()
  sku?: string | null;

  @ApiPropertyOptional()
  barcode?: string | null;

  @ApiPropertyOptional()
  price?: string | null;

  @ApiPropertyOptional()
  compareAtPrice?: string | null;

  @ApiPropertyOptional()
  purchaseCost?: string | null;

  @ApiProperty()
  stockQuantity!: number;

  @ApiPropertyOptional()
  desiredQuantity?: number | null;

  @ApiProperty({ enum: ProductVariantStatus })
  status!: ProductVariantStatus;

  @ApiPropertyOptional()
  customAttributes?: Record<string, unknown> | null;

  @ApiPropertyOptional()
  featuredImageKey?: string | null;

  @ApiPropertyOptional()
  featuredImageMimeType?: string | null;

  @ApiPropertyOptional()
  featuredImageWidth?: number | null;

  @ApiPropertyOptional()
  featuredImageHeight?: number | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ type: [ProductVariantOptionValueResponseDto] })
  optionValues!: ProductVariantOptionValueResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
