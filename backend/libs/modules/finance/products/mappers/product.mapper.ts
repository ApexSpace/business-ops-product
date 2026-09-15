import { ProductImage } from '@prisma/client';
import { ProductBundleItemWithRelations } from '../repositories/product-bundle.repository';
import {
  ProductDetail,
  ProductListItem,
} from '../repositories/product.repository';
import { ProductOptionWithValues } from '../repositories/product-option.repository';
import {
  ProductDetailResponseDto,
  ProductInventoryAdjustmentResponseDto,
  ProductListItemResponseDto,
} from '../dto/product.dto';
import { ProductBundleItemResponseDto } from '../dto/product-bundle.dto';
import { ProductImageResponseDto } from '../dto/product-image.dto';
import { ProductOptionResponseDto } from '../dto/product-option.dto';
import { toProductVariantResponse } from './product-variant.mapper';

export function toProductListItemResponse(
  product: ProductListItem,
): ProductListItemResponseDto {
  return {
    id: product.id,
    businessId: product.businessId,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    productType: product.productType,
    name: product.name,
    brand: product.brand,
    unitPrice: product.unitPrice.toString(),
    sku: product.sku,
    stockQuantity: product.stockQuantity,
    trackInventory: product.trackInventory,
    status: product.status,
    sortOrder: product.sortOrder,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function toProductOptionResponse(
  option: ProductOptionWithValues,
): ProductOptionResponseDto {
  return {
    id: option.id,
    productId: option.productId,
    name: option.name,
    sortOrder: option.sortOrder,
    values: option.values.map((value) => ({
      id: value.id,
      value: value.value,
      sortOrder: value.sortOrder,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    })),
    createdAt: option.createdAt,
    updatedAt: option.updatedAt,
  };
}

function toProductImageResponse(image: ProductImage): ProductImageResponseDto {
  return {
    id: image.id,
    productId: image.productId,
    storageKey: image.storageKey,
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
    altText: image.altText,
    sortOrder: image.sortOrder,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  };
}

function toBundleItemResponse(
  item: ProductBundleItemWithRelations,
): ProductBundleItemResponseDto {
  return {
    id: item.id,
    bundleProductId: item.bundleProductId,
    componentProductId: item.componentProductId,
    componentVariantId: item.componentVariantId,
    quantity: item.quantity,
    componentProductName: item.componentProduct?.name ?? null,
    componentVariantKey: item.componentVariant?.variantKey ?? null,
  };
}

function toAdjustmentResponse(
  adjustment: ProductDetail['inventoryAdjustments'][number],
): ProductInventoryAdjustmentResponseDto {
  return {
    id: adjustment.id,
    variantId: adjustment.variantId,
    variantKey: adjustment.variant?.variantKey ?? null,
    type: adjustment.type,
    quantityChange: adjustment.quantityChange,
    note: adjustment.note,
    actorUserId: adjustment.actorUserId,
    actorName: adjustment.actor
      ? [adjustment.actor.firstName, adjustment.actor.lastName]
          .filter(Boolean)
          .join(' ')
      : null,
    createdAt: adjustment.createdAt,
  };
}

export function toProductDetailResponse(
  product: ProductDetail,
): ProductDetailResponseDto {
  return {
    ...toProductListItemResponse(product),
    description: product.description,
    supplier: product.supplier,
    unitLabel: product.unitLabel,
    purchaseCost: product.purchaseCost?.toString() ?? null,
    chargeTax: product.chargeTax,
    barcode: product.barcode,
    desiredQuantity: product.desiredQuantity,
    commissionEnabled: product.commissionEnabled,
    assignStaffToSale: product.assignStaffToSale,
    considerAsSalesRevenue: product.considerAsSalesRevenue,
    autoAddToNewSales: product.autoAddToNewSales,
    customAttributes:
      (product.customAttributes as Record<string, unknown> | null) ?? null,
    featuredImageKey: product.featuredImageKey,
    featuredImageMimeType: product.featuredImageMimeType,
    featuredImageWidth: product.featuredImageWidth,
    featuredImageHeight: product.featuredImageHeight,
    options: product.options.map(toProductOptionResponse),
    variants: product.variants.map(toProductVariantResponse),
    images: product.images.map(toProductImageResponse),
    bundleItems: product.bundleItemsAsBundle.map(toBundleItemResponse),
    recentAdjustments: product.inventoryAdjustments.map(toAdjustmentResponse),
  };
}
