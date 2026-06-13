export { uploadFile } from "./services/storage-upload.service";

export {
  confirmUpload,
  createUpload,
  deleteFileAsset,
  failUpload,
  getFileAsset,
  getFileDownloadUrl,
} from "./api/storage.api";

export { useStorageUpload } from "./hooks/use-storage-upload";
export { useFileDownloadUrl } from "./hooks/use-file-download-url";
export { useDeleteFileAsset } from "./hooks/use-delete-file-asset";

export {
  StorageUploadError,
  normalizeUploadError,
  type StorageUploadErrorCode,
} from "./utils/upload-error.util";

export { detectFileCategory, getFileExtension } from "./utils/file-category.util";
export {
  formatFileSize,
  validateFileForUpload,
} from "./utils/file-validation.util";
export { uploadToSignedUrl } from "./utils/signed-url-upload";

export type {
  CreateUploadInput,
  CreateUploadResponse,
  FileAsset,
  FileAssetStatus,
  FileCategory,
  FileVisibility,
  SignedDownloadResponse,
  UploadFileInput,
  UploadFileResult,
  UploadProgressHandler,
} from "./types/storage.types";
