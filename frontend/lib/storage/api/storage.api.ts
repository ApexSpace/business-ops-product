import { api } from "@/lib/api/client";
import type {
  CreateUploadInput,
  CreateUploadResponse,
  FileAsset,
  SignedDownloadResponse,
} from "../types/storage.types";

export function createUpload(
  input: CreateUploadInput,
): Promise<CreateUploadResponse> {
  return api.post<CreateUploadResponse>("storage/uploads", {
    filename: input.filename,
    mimeType: input.mimeType,
    size: input.size,
    category: input.category,
    visibility: input.visibility ?? "PRIVATE",
  });
}

export function confirmUpload(fileAssetId: string): Promise<FileAsset> {
  return api.post<FileAsset>(`storage/uploads/${fileAssetId}/confirm`, {});
}

export function failUpload(
  fileAssetId: string,
  reason = "Frontend upload failed",
): Promise<FileAsset> {
  return api.post<FileAsset>(`storage/uploads/${fileAssetId}/fail`, {
    reason,
  });
}

export function getFileAsset(fileAssetId: string): Promise<FileAsset> {
  return api.get<FileAsset>(`storage/files/${fileAssetId}`);
}

export function getFileDownloadUrl(
  fileAssetId: string,
): Promise<SignedDownloadResponse> {
  return api.get<SignedDownloadResponse>(
    `storage/files/${fileAssetId}/download-url`,
  );
}

export function deleteFileAsset(fileAssetId: string): Promise<void> {
  return api.delete<void>(`storage/files/${fileAssetId}`);
}
