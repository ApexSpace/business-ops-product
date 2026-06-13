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

  async createSignedDownloadUrl(objectKey: string): Promise<SignedDownloadResult> {
    const { client, config } = this.requireClient();
    const expiresIn = config.signedDownloadExpiresSeconds;

    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
    });

    const downloadUrl = await getSignedUrl(client, command, { expiresIn });
    return { downloadUrl, expiresIn };
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
}
