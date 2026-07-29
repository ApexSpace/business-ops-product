import { ProductVariantWithOptions } from '../repositories/product-variant.repository';
import {
  ProductVariantOptionValueResponseDto,
  ProductVariantResponseDto,
} from '../dto/product-variant.dto';

export function toProductVariantOptionValueResponse(
  link: ProductVariantWithOptions['optionValues'][number],
): ProductVariantOptionValueResponseDto {
  return {
    optionId: link.optionValue.option.id,
    optionName: link.optionValue.option.name,
    optionValueId: link.optionValue.id,
    value: link.optionValue.value,
  };
}

export function toProductVariantResponse(
  variant: ProductVariantWithOptions,
): ProductVariantResponseDto {
  return {
    id: variant.id,
    productId: variant.productId,
    variantKey: variant.variantKey,
    sku: variant.sku,
    barcode: variant.barcode,
    price: variant.price?.toString() ?? null,
    compareAtPrice: variant.compareAtPrice?.toString() ?? null,
    purchaseCost: variant.purchaseCost?.toString() ?? null,
    stockQuantity: variant.stockQuantity,
    desiredQuantity: variant.desiredQuantity,
    status: variant.status,
    customAttributes:
      (variant.customAttributes as Record<string, unknown> | null) ?? null,
    featuredImageKey: variant.featuredImageKey,
    featuredImageMimeType: variant.featuredImageMimeType,
    featuredImageWidth: variant.featuredImageWidth,
    featuredImageHeight: variant.featuredImageHeight,
    sortOrder: variant.sortOrder,
    optionValues: variant.optionValues.map(toProductVariantOptionValueResponse),
    createdAt: variant.createdAt,
    updatedAt: variant.updatedAt,
  };
}
