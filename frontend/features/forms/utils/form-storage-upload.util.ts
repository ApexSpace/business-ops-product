import {
  confirmUpload,
  createUpload,
  failUpload,
} from "@/lib/storage/api/storage.api";
import type { FileAsset, UploadFileInput } from "@/lib/storage/types/storage.types";
import { detectFileCategory } from "@/lib/storage/utils/file-category.util";
import { validateFileForUpload } from "@/lib/storage/utils/file-validation.util";
import { uploadToSignedUrl } from "@/lib/storage/utils/signed-url-upload";
import {
  StorageUploadError,
  normalizeUploadError,
} from "@/lib/storage/utils/upload-error.util";
import {
  createPublicFormUpload,
  confirmPublicFormUpload,
  failPublicFormUpload,
} from "@/features/public-forms/api/public-forms.api";

async function uploadViaAuthenticatedStorage(
  input: UploadFileInput,
): Promise<FileAsset> {
  let fileAssetId: string | null = null;

  try {
    validateFileForUpload(input);

    const created = await createUpload({
      filename: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
      size: input.file.size,
      category: detectFileCategory(input.file),
      visibility: input.visibility ?? "PRIVATE",
    });

    fileAssetId = created.fileAssetId;

    await uploadToSignedUrl({
      file: input.file,
      uploadUrl: created.uploadUrl,
      onProgress: input.onProgress,
    });

    return await confirmUpload(created.fileAssetId);
  } catch (error) {
    if (fileAssetId) {
      try {
        await failUpload(fileAssetId, "Frontend upload failed");
      } catch {
        /* preserve original error */
      }
    }
    throw normalizeUploadError(error);
  }
}

async function uploadViaPublicForm(
  publicKey: string,
  input: UploadFileInput,
): Promise<FileAsset> {
  let fileAssetId: string | null = null;

  try {
    validateFileForUpload(input);

    const created = await createPublicFormUpload(publicKey, {
      filename: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
      size: input.file.size,
      category: detectFileCategory(input.file),
      visibility: input.visibility ?? "PRIVATE",
    });

    fileAssetId = created.fileAssetId;

    await uploadToSignedUrl({
      file: input.file,
      uploadUrl: created.uploadUrl,
      onProgress: input.onProgress,
    });

    return await confirmPublicFormUpload(publicKey, created.fileAssetId);
  } catch (error) {
    if (fileAssetId) {
      try {
        await failPublicFormUpload(publicKey, fileAssetId, "Frontend upload failed");
      } catch {
        /* preserve original error */
      }
    }
    throw error instanceof StorageUploadError
      ? error
      : normalizeUploadError(error);
  }
}

export async function uploadFormFile(
  input: UploadFileInput & { publicKey?: string },
): Promise<FileAsset> {
  if (input.publicKey) {
    return uploadViaPublicForm(input.publicKey, input);
  }
  return uploadViaAuthenticatedStorage(input);
}
