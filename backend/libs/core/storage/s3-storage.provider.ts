import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import type { StorageConfig } from './storage.types';

export class S3StorageProvider {
  private readonly client: S3Client;

  constructor(private readonly config: StorageConfig) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : undefined,
      forcePathStyle: config.provider === 'minio',
    });
  }

  buildObjectKey(businessId: string, originalName: string): string {
    const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
    return `${businessId}/${randomUUID()}/${safe}`;
  }

  async createPresignedUploadUrl(params: {
    key: string;
    mimeType: string;
    maxBytes: number;
    expiresInSeconds?: number;
  }): Promise<{ uploadUrl: string; expiresAt: Date }> {
    const expiresIn = params.expiresInSeconds ?? 900;
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: params.key,
      ContentType: params.mimeType,
      ContentLength: params.maxBytes,
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });
    return {
      uploadUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  async createPresignedDownloadUrl(
    key: string,
    expiresInSeconds: number,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
  }

  async headObject(key: string): Promise<{ sizeBytes: number; contentType?: string }> {
    const result = await this.client.send(
      new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
    return {
      sizeBytes: result.ContentLength ?? 0,
      contentType: result.ContentType,
    };
  }
}
