import {
  attachBookingPhotos,
  confirmBookingPhotoUpload,
  createBookingPhotoUpload,
  failBookingPhotoUpload,
} from "@/features/public-booking/api/public-booking.api";
import { uploadToSignedUrl } from "@/lib/storage/utils/signed-url-upload";
import {
  StorageUploadError,
  normalizeUploadError,
} from "@/lib/storage/utils/upload-error.util";

const MAX_BOOKING_PHOTOS = 3;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function getMaxBookingPhotos() {
  return MAX_BOOKING_PHOTOS;
}

function validateBookingPhoto(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new StorageUploadError(
      "Please upload a JPEG, PNG, WebP, or GIF image.",
      "VALIDATION_FAILED",
    );
  }
  if (file.size <= 0 || file.size > MAX_PHOTO_BYTES) {
    throw new StorageUploadError(
      "Each photo must be 10 MB or smaller.",
      "VALIDATION_FAILED",
    );
  }
}

export async function uploadBookingPhoto(params: {
  slug: string;
  appointmentId: string;
  uploadToken: string;
  file: File;
}): Promise<string> {
  validateBookingPhoto(params.file);

  let fileAssetId: string | null = null;
  try {
    const created = await createBookingPhotoUpload(params.slug, {
      appointmentId: params.appointmentId,
      uploadToken: params.uploadToken,
      filename: params.file.name,
      mimeType: params.file.type || "image/jpeg",
      size: params.file.size,
    });
    fileAssetId = created.fileAssetId;

    await uploadToSignedUrl({
      file: params.file,
      uploadUrl: created.uploadUrl,
    });

    await confirmBookingPhotoUpload(params.slug, created.fileAssetId, {
      appointmentId: params.appointmentId,
      uploadToken: params.uploadToken,
    });

    return created.fileAssetId;
  } catch (error) {
    if (fileAssetId) {
      try {
        await failBookingPhotoUpload(params.slug, fileAssetId, {
          appointmentId: params.appointmentId,
          uploadToken: params.uploadToken,
          reason: "Frontend upload failed",
        });
      } catch {
        /* preserve original error */
      }
    }
    throw error instanceof StorageUploadError
      ? error
      : normalizeUploadError(error);
  }
}

export async function uploadAndAttachBookingPhotos(params: {
  slug: string;
  appointmentId: string;
  uploadToken: string;
  files: File[];
  alreadyAttached?: number;
}): Promise<string[]> {
  const remaining =
    MAX_BOOKING_PHOTOS - Math.max(0, params.alreadyAttached ?? 0);
  if (remaining <= 0) {
    throw new StorageUploadError(
      "You can upload up to 3 photos.",
      "VALIDATION_FAILED",
    );
  }

  const files = params.files.slice(0, remaining);
  const fileIds: string[] = [];
  for (const file of files) {
    const id = await uploadBookingPhoto({
      slug: params.slug,
      appointmentId: params.appointmentId,
      uploadToken: params.uploadToken,
      file,
    });
    fileIds.push(id);
  }

  if (fileIds.length === 0) return [];

  const result = await attachBookingPhotos(params.slug, {
    appointmentId: params.appointmentId,
    uploadToken: params.uploadToken,
    fileIds,
  });
  return result.photoFileIds;
}
