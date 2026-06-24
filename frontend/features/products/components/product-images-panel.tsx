"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  addProductGalleryImage,
  clearProductFeaturedImage,
  removeProductGalleryImage,
  setProductFeaturedImage,
} from "@/features/products/api/products.api";
import {
  useProductFeaturedImage,
  useProductGalleryImageDownloadUrl,
  useProductGalleryImages,
} from "@/features/products/hooks/use-product-image-download-url";
import type { ProductImage } from "@/features/products/types";
import {
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_MAX_MB,
  PRODUCT_MIN_IMAGE_DIMENSION,
  uploadProductImageFile,
} from "@/features/products/utils/product-image-upload.util";
import { StorageUploadError, useFileDownloadUrl } from "@/lib/storage";
import { invalidateProductDetail } from "@/lib/query/invalidation";
import { queryKeys } from "@/lib/query/keys";

const MAX_GALLERY_IMAGES = 10;

interface ProductImagesPanelProps {
  productId: string;
  featuredImageKey?: string | null;
}

function ProductImagePreview({
  alt,
  className,
  downloadUrl,
  isLoading,
  onError,
}: {
  alt: string;
  className?: string;
  downloadUrl?: string | null;
  isLoading?: boolean;
  onError?: () => void;
}) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/30 text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!downloadUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/20 text-muted-foreground",
          className,
        )}
      >
        <ImagePlus className="size-6" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={downloadUrl}
      alt={alt}
      className={cn("object-cover", className)}
      onError={onError}
    />
  );
}

function ProductGalleryImagePreview({
  productId,
  image,
}: {
  productId: string;
  image: ProductImage;
}) {
  const queryClient = useQueryClient();

  const downloadQuery = useProductGalleryImageDownloadUrl(productId, image.id, {
    enabled: !image.downloadUrl,
  });

  const downloadUrl = image.downloadUrl ?? downloadQuery.data?.downloadUrl ?? null;
  const isLoading =
    !downloadUrl &&
    (downloadQuery.isPending || downloadQuery.isFetching);

  const handleError = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.products.galleryImageDownload(productId, image.id),
    });
    if (image.downloadUrl) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.products.gallery(productId),
      });
    }
  }, [queryClient, productId, image.id, image.downloadUrl]);

  return (
    <ProductImagePreview
      alt={image.altText ?? "Product gallery image"}
      className="aspect-square w-full"
      downloadUrl={downloadUrl}
      isLoading={isLoading}
      onError={handleError}
    />
  );
}

export function ProductImagesPanel({
  productId,
  featuredImageKey,
}: ProductImagesPanelProps) {
  const queryClient = useQueryClient();
  const featuredInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFeatured, setUploadingFeatured] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [featuredPreviewAssetId, setFeaturedPreviewAssetId] = useState<
    string | null
  >(null);
  const [featuredLocalPreview, setFeaturedLocalPreview] = useState<
    string | null
  >(null);

  const featuredQuery = useProductFeaturedImage(productId, {
    enabled: !!featuredImageKey,
  });
  const galleryQuery = useProductGalleryImages(productId);
  const previewAssetQuery = useFileDownloadUrl(featuredPreviewAssetId ?? "", {
    enabled: !!featuredPreviewAssetId,
  });

  const hasFeaturedImage = Boolean(
    featuredImageKey ||
      featuredPreviewAssetId ||
      featuredLocalPreview ||
      featuredQuery.data?.featuredImageKey,
  );

  const galleryImages = galleryQuery.data ?? [];

  const invalidateProduct = () => {
    void invalidateProductDetail(queryClient, productId);
  };

  const mergeGalleryImage = (image: ProductImage) => {
    queryClient.setQueryData(
      queryKeys.products.gallery(productId),
      (current: ProductImage[] | undefined) => {
        const existing = current ?? [];
        const index = existing.findIndex((item) => item.id === image.id);
        if (index === -1) {
          return [...existing, image];
        }
        const next = [...existing];
        next[index] = { ...next[index], ...image };
        return next;
      },
    );
  };

  const setFeaturedMutation = useMutation({
    mutationFn: (fileAssetId: string) =>
      setProductFeaturedImage(productId, { fileAssetId }),
    onSuccess: (data) => {
      toast.success("Featured image updated");
      queryClient.setQueryData(
        queryKeys.products.featuredImage(productId),
        data,
      );
      invalidateProduct();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const clearFeaturedMutation = useMutation({
    mutationFn: () => clearProductFeaturedImage(productId),
    onSuccess: () => {
      toast.success("Featured image removed");
      setFeaturedPreviewAssetId(null);
      if (featuredLocalPreview) {
        URL.revokeObjectURL(featuredLocalPreview);
        setFeaturedLocalPreview(null);
      }
      queryClient.setQueryData(queryKeys.products.featuredImage(productId), {
        featuredImageKey: null,
        featuredImageMimeType: null,
        featuredImageWidth: null,
        featuredImageHeight: null,
        downloadUrl: null,
        expiresIn: null,
      });
      invalidateProduct();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addGalleryMutation = useMutation({
    mutationFn: (fileAssetId: string) =>
      addProductGalleryImage(productId, { fileAssetId }),
    onSuccess: (image) => {
      toast.success("Gallery image added");
      mergeGalleryImage(image);
      if (image.downloadUrl) {
        queryClient.setQueryData(
          queryKeys.products.galleryImageDownload(productId, image.id),
          {
            downloadUrl: image.downloadUrl,
            expiresIn: image.expiresIn,
          },
        );
      }
      invalidateProduct();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeGalleryMutation = useMutation({
    mutationFn: (imageId: string) =>
      removeProductGalleryImage(productId, imageId),
    onSuccess: (_, imageId) => {
      toast.success("Gallery image removed");
      queryClient.setQueryData(
        queryKeys.products.gallery(productId),
        (current: ProductImage[] | undefined) =>
          (current ?? []).filter((image) => image.id !== imageId),
      );
      queryClient.removeQueries({
        queryKey: queryKeys.products.galleryImageDownload(productId, imageId),
      });
      invalidateProduct();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  useEffect(() => {
    return () => {
      if (featuredLocalPreview) {
        URL.revokeObjectURL(featuredLocalPreview);
      }
    };
  }, [featuredLocalPreview]);

  useEffect(() => {
    if (!featuredQuery.data?.downloadUrl) {
      return;
    }

    if (featuredPreviewAssetId) {
      setFeaturedPreviewAssetId(null);
    }
    if (featuredLocalPreview) {
      URL.revokeObjectURL(featuredLocalPreview);
      setFeaturedLocalPreview(null);
    }
  }, [
    featuredQuery.data?.downloadUrl,
    featuredPreviewAssetId,
    featuredLocalPreview,
  ]);

  const handleFeaturedImageError = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.products.featuredImage(productId),
    });
  }, [queryClient, productId]);

  const featuredDownloadUrl =
    featuredLocalPreview ??
    featuredQuery.data?.downloadUrl ??
    previewAssetQuery.data?.downloadUrl ??
    null;

  const awaitingPersistentFeaturedUrl =
    hasFeaturedImage && !featuredLocalPreview && !featuredDownloadUrl;

  const featuredLoading =
    awaitingPersistentFeaturedUrl &&
    (uploadingFeatured ||
      setFeaturedMutation.isPending ||
      featuredQuery.isPending ||
      featuredQuery.isFetching ||
      (!!featuredPreviewAssetId &&
        (previewAssetQuery.isPending || previewAssetQuery.isFetching)));

  async function handleFileSelected(
    file: File,
    target: "featured" | "gallery",
  ) {
    const setUploading =
      target === "featured" ? setUploadingFeatured : setUploadingGallery;

    let objectUrl: string | null = null;
    if (target === "featured") {
      objectUrl = URL.createObjectURL(file);
      if (featuredLocalPreview) {
        URL.revokeObjectURL(featuredLocalPreview);
      }
      setFeaturedLocalPreview(objectUrl);
    }

    setUploading(true);
    try {
      const fileAssetId = await uploadProductImageFile(file);
      if (target === "featured") {
        setFeaturedPreviewAssetId(fileAssetId);
        await setFeaturedMutation.mutateAsync(fileAssetId);
      } else {
        await addGalleryMutation.mutateAsync(fileAssetId);
      }
    } catch (error) {
      if (target === "featured") {
        setFeaturedPreviewAssetId(null);
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        setFeaturedLocalPreview(null);
      }
      toast.error(
        error instanceof StorageUploadError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Upload failed",
      );
    } finally {
      setUploading(false);
    }
  }

  const galleryFull = galleryImages.length >= MAX_GALLERY_IMAGES;
  const imageBusy =
    uploadingFeatured ||
    uploadingGallery ||
    setFeaturedMutation.isPending ||
    addGalleryMutation.isPending;

  return (
    <div className="space-y-4 border-b p-4">
      <div>
        <p className="text-sm font-medium">Images</p>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, or WebP · max {PRODUCT_IMAGE_MAX_MB} MB · min{" "}
          {PRODUCT_MIN_IMAGE_DIMENSION}px
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Star className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Featured image</p>
        </div>
        <div className="overflow-hidden rounded-md border bg-muted/10">
          {hasFeaturedImage ? (
            <ProductImagePreview
              alt="Featured product image"
              className="aspect-[4/3] w-full"
              downloadUrl={featuredDownloadUrl}
              isLoading={featuredLoading}
              onError={handleFeaturedImageError}
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground">
              <ImagePlus className="size-8" />
            </div>
          )}
        </div>
        <input
          ref={featuredInputRef}
          type="file"
          accept={PRODUCT_IMAGE_ACCEPT}
          className="hidden"
          disabled={imageBusy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFileSelected(file, "featured");
            }
            event.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={imageBusy}
            onClick={() => featuredInputRef.current?.click()}
          >
            {uploadingFeatured ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Uploading…
              </>
            ) : hasFeaturedImage ? (
              "Replace featured"
            ) : (
              "Upload featured"
            )}
          </Button>
          {hasFeaturedImage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={imageBusy || clearFeaturedMutation.isPending}
              onClick={() => clearFeaturedMutation.mutate()}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          Gallery ({galleryImages.length}/{MAX_GALLERY_IMAGES})
        </p>
        {galleryQuery.isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading gallery…
          </div>
        ) : galleryImages.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {galleryImages.map((image) => (
              <div
                key={image.id}
                className="group relative overflow-hidden rounded-md border"
              >
                <ProductGalleryImagePreview
                  productId={productId}
                  image={image}
                />
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100"
                  disabled={removeGalleryMutation.isPending}
                  onClick={() => removeGalleryMutation.mutate(image.id)}
                  aria-label="Remove gallery image"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No gallery images yet.</p>
        )}
        <input
          ref={galleryInputRef}
          type="file"
          accept={PRODUCT_IMAGE_ACCEPT}
          className="hidden"
          disabled={imageBusy || galleryFull}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleFileSelected(file, "gallery");
            }
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={imageBusy || galleryFull}
          onClick={() => galleryInputRef.current?.click()}
        >
          {uploadingGallery ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Uploading…
            </>
          ) : (
            "Add gallery image"
          )}
        </Button>
      </div>
    </div>
  );
}
