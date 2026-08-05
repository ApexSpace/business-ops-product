import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { resolveR2Config } from '../config/r2.config';
import type {
  R2Config,
  SignedDownloadResult,
  SignedUploadResult,
} from '../types/storage.types';
import { buildPublicObjectUrl } from '../utils/public-object-url.util';

function buildAttachmentContentDisposition(fileName: string): string {
  const safe = fileName.replace(/["\\\r\n]/g, '_');
  return `attachment; filename="${safe}"`;
}

@Injectable()
export class R2StorageProvider {
  private readonly logger = new Logger(R2StorageProvider.name);
  private readonly config: R2Config | null;
  private readonly client: S3Client | null;

  constructor() {
    this.config = resolveR2Config();
    if (this.config) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: this.config.endpoint,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
        forcePathStyle: true,
      });
    } else {
      this.client = null;
      this.logger.warn('R2 storage is not fully configured');
    }
  }

  isConfigured(): boolean {
    return this.config !== null && this.client !== null;
  }

  private requireClient(): { client: S3Client; config: R2Config } {
    if (!this.client || !this.config) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Object storage is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return { client: this.client, config: this.config };
  }

  async createSignedUploadUrl(params: {
    objectKey: string;
    mimeType: string;
    size: number;
  }): Promise<SignedUploadResult> {
    const { client, config } = this.requireClient();
    const expiresIn = config.signedUploadExpiresSeconds;

    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: params.objectKey,
      ContentType: params.mimeType,
      ContentLength: params.size,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });
    return { uploadUrl, expiresIn };
  }

  async createSignedDownloadUrl(
    objectKey: string,
    options?: { downloadFileName?: string },
  ): Promise<SignedDownloadResult> {
    const { client, config } = this.requireClient();
    const expiresIn = config.signedDownloadExpiresSeconds;

    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      ...(options?.downloadFileName
        ? {
            ResponseContentDisposition: buildAttachmentContentDisposition(
              options.downloadFileName,
            ),
          }
        : {}),
    });

    const downloadUrl = await getSignedUrl(client, command, { expiresIn });
    return { downloadUrl, expiresIn };
  }

  /**
   * Stable public CDN URL when R2_PUBLIC_BASE_URL is set.
   * Used by pull-based publish adapters (TikTok, Meta, etc.).
   */
  getPublicUrl(objectKey: string): string | null {
    const base = this.config?.publicBaseUrl?.trim();
    if (!base) return null;
    return buildPublicObjectUrl(base, objectKey);
  }

  hasPublicBaseUrl(): boolean {
    return Boolean(this.config?.publicBaseUrl?.trim());
  }

  async deleteObject(objectKey: string): Promise<void> {
    const { client, config } = this.requireClient();
    await client.send(
      new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey }),
    );
  }

  async objectExists(objectKey: string): Promise<boolean> {
    const { client, config } = this.requireClient();
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: config.bucket, Key: objectKey }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async getObjectBytes(objectKey: string): Promise<Buffer> {
    const { client, config } = this.requireClient();
    const response = await client.send(
      new GetObjectCommand({ Bucket: config.bucket, Key: objectKey }),
    );
    const body = response.Body;
    if (!body) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Object body not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
  }

  /** Server-side upload (report generation, system artifacts). */
  async putObject(params: {
    objectKey: string;
    mimeType: string;
    body: Buffer;
  }): Promise<void> {
    const { client, config } = this.requireClient();
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: params.objectKey,
        Body: params.body,
        ContentType: params.mimeType,
        ContentLength: params.body.length,
      }),
    );
  }
}
