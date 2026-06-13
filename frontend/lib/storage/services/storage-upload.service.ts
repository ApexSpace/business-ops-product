import {
  confirmUpload,
  createUpload,
  failUpload,
} from "../api/storage.api";
import type { FileAsset, UploadFileInput } from "../types/storage.types";
import { detectFileCategory } from "../utils/file-category.util";
import { validateFileForUpload } from "../utils/file-validation.util";
import { uploadToSignedUrl } from "../utils/signed-url-upload";
import {
  StorageUploadError,
  normalizeUploadError,
} from "../utils/upload-error.util";

function wrapApiError(
  error: unknown,
  code: StorageUploadError["code"],
): StorageUploadError {
  if (error instanceof StorageUploadError) {
    return error;
  }

  const message =
    error instanceof Error ? error.message : "Storage request failed";

  return new StorageUploadError(message, code, error);
}

export async function uploadFile(input: UploadFileInput): Promise<FileAsset> {
  let fileAssetId: string | null = null;

  try {
    validateFileForUpload(input);

    const category = detectFileCategory(input.file);

    const created = await createUpload({
      filename: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
      size: input.file.size,
      category,
      visibility: input.visibility ?? "PRIVATE",
    }).catch((error) => {
      throw wrapApiError(error, "CREATE_UPLOAD_FAILED");
    });

    fileAssetId = created.fileAssetId;

    await uploadToSignedUrl({
      file: input.file,
      uploadUrl: created.uploadUrl,
      onProgress: input.onProgress,
    });

    return await confirmUpload(created.fileAssetId).catch((error) => {
      throw wrapApiError(error, "CONFIRM_UPLOAD_FAILED");
    });
  } catch (error) {
    if (fileAssetId) {
      try {
        await failUpload(fileAssetId, "Frontend upload failed");
      } catch {
        // Preserve original error
      }
    }

    throw normalizeUploadError(error);
  }
}
