"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getProductFeaturedImage,
  getProductGalleryImageDownloadUrl,
  listProductGalleryImages,
} from "@/features/products/api/products.api";
import { queryKeys } from "@/lib/query/keys";

/** Default R2 signed download TTL is 300s — keep cache shorter than that. */
export const PRODUCT_IMAGE_DOWNLOAD_URL_STALE_MS = 4 * 60 * 1000;

export type ProductImageDownloadQueryOptions = {
  enabled?: boolean;
  staleTime?: number;
  refetchOnMount?: boolean | "always";
};

export function useProductFeaturedImage(
  productId: string,
  options?: ProductImageDownloadQueryOptions,
) {
  const enabled = (options?.enabled ?? true) && !!productId;

  return useQuery({
    queryKey: queryKeys.products.featuredImage(productId),
    queryFn: () => getProductFeaturedImage(productId),
    enabled,
    staleTime: options?.staleTime ?? PRODUCT_IMAGE_DOWNLOAD_URL_STALE_MS,
    refetchOnMount: options?.refetchOnMount ?? "always",
    retry: 1,
  });
}

export function useProductGalleryImages(
  productId: string,
  options?: { enabled?: boolean },
) {
  const enabled = (options?.enabled ?? true) && !!productId;

  return useQuery({
    queryKey: queryKeys.products.gallery(productId),
    queryFn: () => listProductGalleryImages(productId),
    enabled,
    staleTime: PRODUCT_IMAGE_DOWNLOAD_URL_STALE_MS,
    refetchOnMount: "always",
  });
}

export function useProductGalleryImageDownloadUrl(
  productId: string,
  imageId: string,
  options?: ProductImageDownloadQueryOptions,
) {
  const enabled = (options?.enabled ?? true) && !!productId && !!imageId;

  return useQuery({
    queryKey: queryKeys.products.galleryImageDownload(productId, imageId),
    queryFn: () => getProductGalleryImageDownloadUrl(productId, imageId),
    enabled,
    staleTime: options?.staleTime ?? PRODUCT_IMAGE_DOWNLOAD_URL_STALE_MS,
    refetchOnMount: options?.refetchOnMount ?? "always",
    retry: 1,
  });
}
