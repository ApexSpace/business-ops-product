import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { FileAssetStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '../database/prisma.service';
import { S3StorageProvider } from './s3-storage.provider';
import type {
  StorageConfig,
  StorageProviderName,
  UploadIntent,
} from './storage.types';

const ALLOWED_MIME_PREFIXES = [
  'image/',
  'application/pdf',
  'text/csv',
  'text/plain',
];

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private provider: S3StorageProvider | null = null;

  constructor(private readonly prisma: PrismaService) {
    const config = this.resolveConfig();
    if (config.bucket && config.accessKeyId && config.secretAccessKey) {
      this.provider = new S3StorageProvider(config);
    } else {
      this.logger.warn('Storage not fully configured; upload intent will fail');
    }
  }

  private resolveConfig(): StorageConfig {
    return {
      provider: (process.env.STORAGE_PROVIDER ??
        'minio') as StorageProviderName,
      bucket: process.env.STORAGE_BUCKET ?? '',
      region: process.env.STORAGE_REGION ?? 'us-east-1',
      endpoint: process.env.STORAGE_ENDPOINT,
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
      publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
      maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '25', 10),
    };
  }

  private requireProvider(): S3StorageProvider {
    if (!this.provider) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Object storage is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return this.provider;
  }

  validateMimeType(mimeType: string): void {
    const allowed = ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p));
    if (!allowed) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `MIME type not allowed: ${mimeType}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createUploadIntent(params: {
    businessId: string;
    ownerId: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    entityType?: string;
    entityId?: string;
  }): Promise<UploadIntent> {
    const config = this.resolveConfig();
    const maxBytes = config.maxUploadSizeMb * 1024 * 1024;
    if (params.sizeBytes > maxBytes) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `File exceeds maximum size of ${config.maxUploadSizeMb}MB`,
        HttpStatus.BAD_REQUEST,
      );
    }
    this.validateMimeType(params.mimeType);

    const storage = this.requireProvider();
    const key = storage.buildObjectKey(params.businessId, params.originalName);
    const asset = await this.prisma.fileAsset.create({
      data: {
        businessId: params.businessId,
        ownerId: params.ownerId,
        entityType: params.entityType,
        entityId: params.entityId,
        storageProvider: config.provider,
        bucket: config.bucket,
        key,
        originalName: params.originalName,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        status: FileAssetStatus.PENDING_UPLOAD,
      },
    });

    const { uploadUrl, expiresAt } = await storage.createPresignedUploadUrl({
      key,
      mimeType: params.mimeType,
      maxBytes: params.sizeBytes,
    });

    return {
      fileAssetId: asset.id,
      uploadUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async confirmUpload(
    businessId: string,
    fileAssetId: string,
    ownerId: string,
  ) {
    const asset = await this.prisma.fileAsset.findFirst({
      where: { id: fileAssetId, businessId, ownerId, deletedAt: null },
    });
    if (!asset) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'File not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (asset.status === FileAssetStatus.READY) {
      return asset;
    }

    const storage = this.requireProvider();
    const head = await storage.headObject(asset.key);

    return this.prisma.fileAsset.update({
      where: { id: asset.id },
      data: {
        status: FileAssetStatus.READY,
        sizeBytes: head.sizeBytes,
      },
    });
  }

  async getSignedDownloadUrl(
    businessId: string,
    fileAssetId: string,
    ownerId?: string,
  ): Promise<{ url: string; expiresInSeconds: number }> {
    const asset = await this.prisma.fileAsset.findFirst({
      where: {
        id: fileAssetId,
        businessId,
        status: FileAssetStatus.READY,
        deletedAt: null,
        ...(ownerId ? { ownerId } : {}),
      },
    });
    if (!asset) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'File not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const storage = this.requireProvider();
    const expiresInSeconds = 600;
    const url = await storage.createPresignedDownloadUrl(
      asset.key,
      expiresInSeconds,
    );
    return { url, expiresInSeconds };
  }

  async deleteObject(fileAssetId: string, businessId: string): Promise<void> {
    const asset = await this.prisma.fileAsset.findFirst({
      where: { id: fileAssetId, businessId },
    });
    if (!asset) return;
    try {
      const storage = this.requireProvider();
      await storage.deleteObject(asset.key);
    } catch (err) {
      this.logger.warn(
        `S3 delete failed for ${asset.key}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    await this.prisma.fileAsset.update({
      where: { id: fileAssetId },
      data: { status: FileAssetStatus.DELETED, deletedAt: new Date() },
    });
  }
}
