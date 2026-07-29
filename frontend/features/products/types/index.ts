export type ProductType = "SIMPLE" | "VARIABLE" | "BUNDLE";
export type ProductStatus = "ACTIVE" | "ARCHIVED";

export type ProductInventoryAdjustmentType =
  | "RECEIVED"
  | "RECOUNT"
  | "PROFESSIONAL_USE"
  | "OTHER"
  | "SALE"
  | "RETURNED";

export interface ProductListItem {
  id: string;
  businessId: string;
  categoryId?: string | null;
  categoryName?: string | null;
  productType: ProductType;
  name: string;
  brand?: string | null;
  unitPrice: string;
  sku?: string | null;
  stockQuantity: number;
  trackInventory: boolean;
  status: ProductStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariantOptionValue {
  optionId: string;
  optionName: string;
  optionValueId: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  variantKey: string;
  sku?: string | null;
  barcode?: string | null;
  price?: string | null;
  compareAtPrice?: string | null;
  purchaseCost?: string | null;
  stockQuantity: number;
  desiredQuantity?: number | null;
  status: string;
  sortOrder: number;
  optionValues: ProductVariantOptionValue[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductOptionValue {
  id: string;
  value: string;
  sortOrder: number;
}

export interface ProductOption {
  id: string;
  name: string;
  sortOrder: number;
  values: ProductOptionValue[];
}

export interface ProductInventoryAdjustment {
  id: string;
  variantId?: string | null;
  variantKey?: string | null;
  type: ProductInventoryAdjustmentType;
  quantityChange: number;
  note?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  createdAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  storageKey: string;
  mimeType: string;
  width: number;
  height: number;
  altText?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  downloadUrl?: string | null;
  expiresIn?: number | null;
}

export interface ProductDetail extends ProductListItem {
  description?: string | null;
  supplier?: string | null;
  unitLabel?: string | null;
  purchaseCost?: string | null;
  chargeTax: boolean;
  barcode?: string | null;
  desiredQuantity?: number | null;
  commissionEnabled: boolean;
  assignStaffToSale: boolean;
  considerAsSalesRevenue: boolean;
  autoAddToNewSales: boolean;
  customAttributes?: Record<string, unknown> | null;
  options: ProductOption[];
  variants: ProductVariant[];
  images: ProductImage[];
  featuredImageKey?: string | null;
  featuredImageMimeType?: string | null;
  featuredImageWidth?: number | null;
  featuredImageHeight?: number | null;
  bundleItems: unknown[];
  recentAdjustments: ProductInventoryAdjustment[];
}

export interface ProductCategory {
  id: string;
  businessId: string;
  name: string;
  isNonRetail: boolean;
  sortOrder: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPickerItem {
  productId: string;
  variantId?: string | null;
  name: string;
  variantLabel?: string | null;
  productType: ProductType;
  unitPrice: string;
  sku?: string | null;
  stockQuantity: number;
  trackInventory: boolean;
  status: ProductStatus;
  isNonRetail?: boolean;
}

export interface CheckoutProductPickerItem extends ProductPickerItem {}

export type ListProductsFilters = {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProductStatus;
  categoryId?: string;
  productType?: ProductType;
};
