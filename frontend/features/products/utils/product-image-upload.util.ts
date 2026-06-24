import {
  StorageUploadError,
  uploadFile,
  validateFileForUpload,
} from "@/lib/storage";

export const PRODUCT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const PRODUCT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const PRODUCT_IMAGE_MAX_MB = 5;
export const PRODUCT_MIN_IMAGE_DIMENSION = 800;

async function validateProductImageDimensions(file: File): Promise<void> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const dimensions = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const image = new Image();
        image.onload = () =>
          resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(new Error("Invalid image file"));
        image.src = objectUrl;
      },
    );

    if (
      dimensions.width < PRODUCT_MIN_IMAGE_DIMENSION ||
      dimensions.height < PRODUCT_MIN_IMAGE_DIMENSION
    ) {
      throw new StorageUploadError(
        `Image must be at least ${PRODUCT_MIN_IMAGE_DIMENSION}×${PRODUCT_MIN_IMAGE_DIMENSION} pixels.`,
        "VALIDATION_FAILED",
      );
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadProductImageFile(file: File): Promise<string> {
  validateFileForUpload({
    file,
    maxSizeMb: PRODUCT_IMAGE_MAX_MB,
    allowedMimeTypes: [...PRODUCT_IMAGE_MIME_TYPES],
  });
  await validateProductImageDimensions(file);

  const asset = await uploadFile({
    file,
    visibility: "PRIVATE",
  });

  return asset.id;
}
