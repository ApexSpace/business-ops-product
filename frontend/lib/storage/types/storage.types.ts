export type FileCategory =
  | "IMAGE"
  | "PDF"
  | "DOCUMENT"
  | "VIDEO"
  | "AUDIO"
  | "OTHER";

export type FileVisibility = "PRIVATE" | "PUBLIC" | "SIGNED";

export type FileAssetStatus = "PENDING" | "READY" | "FAILED" | "DELETED";

export type FileAsset = {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  status: FileAssetStatus;
  visibility: FileVisibility;
  createdAt: string;
  updatedAt: string;
};

export type CreateUploadInput = {
  filename: string;
  mimeType: string;
  size: number;
  category: FileCategory;
  visibility?: FileVisibility;
};

export type CreateUploadResponse = {
  fileAssetId: string;
  uploadUrl: string;
  expiresIn: number;
};

export type SignedDownloadResponse = {
  downloadUrl: string;
  expiresIn: number;
};

export type UploadProgressHandler = (progress: {
  loaded: number;
  total: number;
  percent: number;
}) => void;

export type UploadFileInput = {
  file: File;
  visibility?: FileVisibility;
  maxSizeMb?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  onProgress?: UploadProgressHandler;
};

export type UploadFileResult = FileAsset;
