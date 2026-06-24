import { api } from "@/lib/api/client";
import type {
  ListProductsFilters,
  ProductCategory,
  ProductDetail,
  ProductImage,
  ProductInventoryAdjustmentType,
  ProductListItem,
  ProductOption,
  ProductPickerItem,
  ProductVariant,
} from "@/features/products/types";

export function listProducts(filters: ListProductsFilters = {}) {
  return api.getPaginated<ProductListItem>("products", { searchParams: filters });
}

export function getProduct(id: string) {
  return api.get<ProductDetail>(`products/${id}`);
}

export function createProduct(body: Record<string, unknown>) {
  return api.post<ProductDetail>("products", body);
}

export function updateProduct(id: string, body: Record<string, unknown>) {
  return api.patch<ProductDetail>(`products/${id}`, body);
}

export function deleteProduct(id: string) {
  return api.delete<void>(`products/${id}?confirm=true`);
}

export function listProductPicker(search?: string) {
  return api.get<ProductPickerItem[]>("products/picker", {
    searchParams: search ? { search } : undefined,
  });
}

export async function exportProductsCsv(): Promise<Blob> {
  const url = new URL("/api/backend/products/export", window.location.origin);
  const res = await fetch(url.toString(), { credentials: "include" });
  if (res.status === 401) {
    const refresh = await fetch("/api/auth/refresh", { method: "POST" });
    if (refresh.ok) {
      const retry = await fetch(url.toString(), { credentials: "include" });
      if (!retry.ok) {
        throw new Error("Export failed");
      }
      return retry.blob();
    }
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) {
    throw new Error("Export failed");
  }
  return res.blob();
}

export function listProductCategories() {
  return api.get<ProductCategory[]>("product-categories");
}

export function createProductCategory(body: {
  name: string;
  isNonRetail?: boolean;
}) {
  return api.post<ProductCategory>("product-categories", body);
}

export function updateProductCategory(
  id: string,
  body: Record<string, unknown>,
) {
  return api.patch<ProductCategory>(`product-categories/${id}`, body);
}

export function deleteProductCategory(id: string) {
  return api.delete<void>(`product-categories/${id}?confirm=true`);
}

export function reorderProductCategories(orderedIds: string[]) {
  return api.post<ProductCategory[]>("product-categories/reorder", {
    orderedIds,
  });
}

export function listProductOptions(productId: string) {
  return api.get<ProductOption[]>(`products/${productId}/options`);
}

export function createProductOption(
  productId: string,
  body: { name: string; sortOrder?: number },
) {
  return api.post<ProductOption>(`products/${productId}/options`, body);
}

export function createProductOptionValue(
  productId: string,
  optionId: string,
  body: { value: string; sortOrder?: number },
) {
  return api.post<{ id: string; value: string; sortOrder: number }>(
    `products/${productId}/options/${optionId}/values`,
    body,
  );
}

export function listProductVariants(productId: string) {
  return api.get<ProductVariant[]>(`products/${productId}/variants`);
}

export function updateProductVariant(
  productId: string,
  variantId: string,
  body: Record<string, unknown>,
) {
  return api.patch<ProductVariant>(
    `products/${productId}/variants/${variantId}`,
    body,
  );
}

export function getProductInventory(
  productId: string,
  filters?: { page?: number; limit?: number; variantId?: string },
) {
  return api.get<{
    productId: string;
    variantId?: string | null;
    stockQuantity: number;
    trackInventory: boolean;
    adjustments: Array<{
      id: string;
      productId: string;
      variantId?: string | null;
      type: ProductInventoryAdjustmentType;
      quantityChange: number;
      note?: string | null;
      createdAt: string;
    }>;
    meta: { total: number; page: number; limit: number };
  }>(`products/${productId}/inventory`, { searchParams: filters });
}

export function createProductInventoryAdjustment(
  productId: string,
  body: {
    variantId?: string;
    type: ProductInventoryAdjustmentType;
    quantityChange: number;
    note?: string;
  },
) {
  return api.post(`products/${productId}/inventory/adjustments`, body);
}

export type ProductFeaturedImage = {
  featuredImageKey?: string | null;
  featuredImageMimeType?: string | null;
  featuredImageWidth?: number | null;
  featuredImageHeight?: number | null;
  downloadUrl?: string | null;
  expiresIn?: number | null;
};

export function getProductFeaturedImage(productId: string) {
  return api.get<ProductFeaturedImage>(`products/${productId}/images/featured`);
}

export function listProductGalleryImages(productId: string) {
  return api.get<ProductImage[]>(`products/${productId}/images`);
}

export function getProductFeaturedImageDownloadUrl(productId: string) {
  return api.get<{ downloadUrl: string; expiresIn: number }>(
    `products/${productId}/images/featured/download-url`,
  );
}

export function getProductGalleryImageDownloadUrl(
  productId: string,
  imageId: string,
) {
  return api.get<{ downloadUrl: string; expiresIn: number }>(
    `products/${productId}/images/${imageId}/download-url`,
  );
}

export function setProductFeaturedImage(
  productId: string,
  body: { fileAssetId: string },
) {
  return api.put<ProductFeaturedImage>(
    `products/${productId}/images/featured`,
    body,
  );
}

export function clearProductFeaturedImage(productId: string) {
  return api.delete(`products/${productId}/images/featured`);
}

export function addProductGalleryImage(
  productId: string,
  body: { fileAssetId: string; altText?: string },
) {
  return api.post<ProductImage>(`products/${productId}/images`, body);
}

export function removeProductGalleryImage(productId: string, imageId: string) {
  return api.delete(`products/${productId}/images/${imageId}`);
}
