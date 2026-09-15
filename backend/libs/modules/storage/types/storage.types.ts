export interface R2Config {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl?: string;
  signedUploadExpiresSeconds: number;
  signedDownloadExpiresSeconds: number;
}

export interface SignedUploadResult {
  uploadUrl: string;
  expiresIn: number;
}

export interface SignedDownloadResult {
  downloadUrl: string;
  expiresIn: number;
}

export interface CreateUploadResult {
  fileAssetId: string;
  uploadUrl: string;
  expiresIn: number;
}
