import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductInventoryAdjustmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '@app/common/dto/pagination-query.dto';

export class CreateProductInventoryAdjustmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ enum: ProductInventoryAdjustmentType })
  @IsEnum(ProductInventoryAdjustmentType)
  type!: ProductInventoryAdjustmentType;

  @ApiProperty({
    description:
      'For RECOUNT, the new absolute stock count. For RECEIVED and RETURNED, a positive quantity to add. For PROFESSIONAL_USE and SALE, a positive quantity to remove. For OTHER, a signed quantity change.',
  })
  @Type(() => Number)
  @IsInt()
  quantityChange!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ListProductInventoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  variantId?: string;
}

export class ProductInventoryAdjustmentListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiPropertyOptional()
  variantId?: string | null;

  @ApiProperty({ enum: ProductInventoryAdjustmentType })
  type!: ProductInventoryAdjustmentType;

  @ApiProperty()
  quantityChange!: number;

  @ApiPropertyOptional()
  note?: string | null;

  @ApiPropertyOptional()
  actorUserId?: string | null;

  @ApiProperty()
  createdAt!: Date;
}

export class ProductInventoryStateResponseDto {
  @ApiProperty()
  productId!: string;

  @ApiPropertyOptional()
  variantId?: string | null;

  @ApiProperty()
  stockQuantity!: number;

  @ApiProperty()
  trackInventory!: boolean;

  @ApiProperty({ type: [ProductInventoryAdjustmentListItemDto] })
  adjustments!: ProductInventoryAdjustmentListItemDto[];

  @ApiProperty()
  meta!: { total: number; page: number; limit: number };
}
