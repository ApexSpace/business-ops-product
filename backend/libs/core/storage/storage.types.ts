export type StorageProviderName = 'aws' | 'r2' | 'spaces' | 'minio';

export interface UploadIntent {
  fileAssetId: string;
  uploadUrl: string;
  expiresAt: string;
  headers?: Record<string, string>;
}

export interface StorageConfig {
  provider: StorageProviderName;
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicBaseUrl?: string;
  maxUploadSizeMb: number;
}
