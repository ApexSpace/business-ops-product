import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class SetProductFeaturedImageDto {
  @ApiProperty()
  @IsUUID()
  fileAssetId!: string;
}

export class AddProductGalleryImageDto {
  @ApiProperty()
  @IsUUID()
  fileAssetId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  altText?: string;
}

export class UpdateProductGalleryImageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  altText?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ReorderProductImagesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderedIds!: string[];
}

export class ProductImageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  storageKey!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  width!: number;

  @ApiProperty()
  height!: number;

  @ApiPropertyOptional()
  altText?: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  downloadUrl?: string | null;

  @ApiPropertyOptional()
  expiresIn?: number | null;
}

export class ProductFeaturedImageResponseDto {
  @ApiPropertyOptional()
  featuredImageKey?: string | null;

  @ApiPropertyOptional()
  featuredImageMimeType?: string | null;

  @ApiPropertyOptional()
  featuredImageWidth?: number | null;

  @ApiPropertyOptional()
  featuredImageHeight?: number | null;

  @ApiPropertyOptional()
  downloadUrl?: string | null;

  @ApiPropertyOptional()
  expiresIn?: number | null;
}
