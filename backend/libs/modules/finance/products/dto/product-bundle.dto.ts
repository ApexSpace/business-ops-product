import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReplaceProductBundleItemDto {
  @ApiProperty()
  @IsUUID()
  componentProductId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  componentVariantId?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class ReplaceProductBundleItemsDto {
  @ApiProperty({ type: [ReplaceProductBundleItemDto] })
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ReplaceProductBundleItemDto)
  items!: ReplaceProductBundleItemDto[];
}

export class ProductBundleItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  bundleProductId!: string;

  @ApiProperty()
  componentProductId!: string;

  @ApiPropertyOptional()
  componentVariantId?: string | null;

  @ApiProperty()
  quantity!: number;

  @ApiPropertyOptional()
  componentProductName?: string | null;

  @ApiPropertyOptional()
  componentVariantKey?: string | null;
}
