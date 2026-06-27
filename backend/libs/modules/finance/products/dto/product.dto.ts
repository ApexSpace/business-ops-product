import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus, ProductType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  name!: string;

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unitLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchaseCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  chargeTax?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  desiredQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  commissionEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  assignStaffToSale?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  considerAsSalesRevenue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoAddToNewSales?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customAttributes?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  brand?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplier?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  unitLabel?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  purchaseCost?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  chargeTax?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

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
  @IsInt()
  @Min(0)
  desiredQuantity?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  commissionEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  assignStaffToSale?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  considerAsSalesRevenue?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoAddToNewSales?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customAttributes?: Record<string, unknown> | null;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}

export class ListProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;
}

export class ProductListItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  businessId!: string;

  @ApiPropertyOptional()
  categoryId?: string | null;

  @ApiPropertyOptional()
  categoryName?: string | null;

  @ApiProperty({ enum: ProductType })
  productType!: ProductType;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  brand?: string | null;

  @ApiProperty()
  unitPrice!: string;

  @ApiPropertyOptional()
  sku?: string | null;

  @ApiProperty()
  stockQuantity!: number;

  @ApiProperty()
  trackInventory!: boolean;

  @ApiProperty({ enum: ProductStatus })
  status!: ProductStatus;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ProductInventoryAdjustmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  variantId?: string | null;

  @ApiPropertyOptional()
  variantKey?: string | null;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  quantityChange!: number;

  @ApiPropertyOptional()
  note?: string | null;

  @ApiPropertyOptional()
  actorUserId?: string | null;

  @ApiPropertyOptional()
  actorName?: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class ProductDetailResponseDto extends ProductListItemResponseDto {
  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  supplier?: string | null;

  @ApiPropertyOptional()
  unitLabel?: string | null;

  @ApiPropertyOptional()
  purchaseCost?: string | null;

  @ApiProperty()
  chargeTax!: boolean;

  @ApiPropertyOptional()
  barcode?: string | null;

  @ApiPropertyOptional()
  desiredQuantity?: number | null;

  @ApiProperty()
  commissionEnabled!: boolean;

  @ApiProperty()
  assignStaffToSale!: boolean;

  @ApiProperty()
  considerAsSalesRevenue!: boolean;

  @ApiProperty()
  autoAddToNewSales!: boolean;

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

  @ApiProperty({ type: [Object] })
  options!: unknown[];

  @ApiProperty({ type: [Object] })
  variants!: unknown[];

  @ApiProperty({ type: [Object] })
  images!: unknown[];

  @ApiProperty({ type: [Object] })
  bundleItems!: unknown[];

  @ApiProperty({ type: [ProductInventoryAdjustmentResponseDto] })
  recentAdjustments!: ProductInventoryAdjustmentResponseDto[];
}

export class ProductPickerItemResponseDto {
  @ApiProperty()
  productId!: string;

  @ApiPropertyOptional()
  variantId?: string | null;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  variantLabel?: string | null;

  @ApiProperty({ enum: ProductType })
  productType!: ProductType;

  @ApiProperty()
  unitPrice!: string;

  @ApiPropertyOptional()
  sku?: string | null;

  @ApiProperty()
  stockQuantity!: number;

  @ApiProperty()
  trackInventory!: boolean;

  @ApiProperty({ enum: ProductStatus })
  status!: ProductStatus;

  @ApiProperty()
  assignStaffToSale!: boolean;
}
