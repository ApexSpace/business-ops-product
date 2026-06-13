import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FileAssetStatus } from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { CreateUploadDto } from '../dto/create-upload.dto';
import { FileAssetResponseDto } from '../dto/file-asset-response.dto';
import { SignedDownloadResponseDto } from '../dto/signed-download-response.dto';
import { toFileAssetResponse } from '../mappers/file-asset.mapper';
import { R2StorageProvider } from '../providers/r2-storage.provider';
import { FileAssetRepository } from '../repositories/file-asset.repository';
import type { CreateUploadResult } from '../types/storage.types';
import { FileAssetService } from './file-asset.service';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly fileAssetRepository: FileAssetRepository,
    private readonly fileAssetService: FileAssetService,
    private readonly r2StorageProvider: R2StorageProvider,
    private readonly auditService: AuditService,
  ) {}

  async createUpload(
    businessId: string,
    dto: CreateUploadDto,
    actor: RequestUser,
  ): Promise<CreateUploadResult> {
    this.fileAssetService.validateUploadInput(dto);

    const fileAssetId = randomUUID();
    const assetData = this.fileAssetService.buildPendingAssetData(
      businessId,
      actor.id,
      dto,
      fileAssetId,
    );

    const asset = await this.fileAssetRepository.create(assetData);

    const { uploadUrl, expiresIn } =
      await this.r2StorageProvider.createSignedUploadUrl({
        objectKey: asset.objectKey,
        mimeType: asset.mimeType,
        size: asset.size,
      });

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'file_asset.upload_created',
      entityType: 'FileAsset',
      entityId: asset.id,
    });

    return { fileAssetId: asset.id, uploadUrl, expiresIn };
  }

  async confirmUpload(
    businessId: string,
    fileAssetId: string,
    actor: RequestUser,
  ): Promise<FileAssetResponseDto> {
    const asset = await this.fileAssetService.getActiveAsset(
      businessId,
      fileAssetId,
    );
    this.fileAssetService.assertConfirmable(asset);

    if (asset.status !== FileAssetStatus.READY) {
      const exists = await this.r2StorageProvider.objectExists(asset.objectKey);
      if (!exists) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Uploaded object not found in storage',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const updated =
      asset.status === FileAssetStatus.READY
        ? asset
        : await this.fileAssetService.markReady(asset.id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'file_asset.upload_confirmed',
      entityType: 'FileAsset',
      entityId: asset.id,
    });

    return toFileAssetResponse(updated);
  }

  async failUpload(
    businessId: string,
    fileAssetId: string,
    reason: string,
    actor: RequestUser,
  ): Promise<FileAssetResponseDto> {
    const asset = await this.fileAssetService.getActiveAsset(
      businessId,
      fileAssetId,
    );
    this.fileAssetService.assertFailAllowed(asset);

    const updated = await this.fileAssetService.markFailed(asset.id, reason);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'file_asset.upload_failed',
      entityType: 'FileAsset',
      entityId: asset.id,
      metadata: { reason },
    });

    return toFileAssetResponse(updated);
  }

  async getFile(
    businessId: string,
    fileAssetId: string,
  ): Promise<FileAssetResponseDto> {
    const asset = await this.fileAssetService.getActiveAsset(
      businessId,
      fileAssetId,
    );
    return toFileAssetResponse(asset);
  }

  async getDownloadUrl(
    businessId: string,
    fileAssetId: string,
  ): Promise<SignedDownloadResponseDto> {
    const asset = await this.fileAssetService.getActiveAsset(
      businessId,
      fileAssetId,
    );
    this.fileAssetService.assertDownloadable(asset);

    const { downloadUrl, expiresIn } =
      await this.r2StorageProvider.createSignedDownloadUrl(asset.objectKey);

    return { downloadUrl, expiresIn };
  }

  async deleteFile(
    businessId: string,
    fileAssetId: string,
    actor: RequestUser,
  ): Promise<FileAssetResponseDto> {
    const asset = await this.fileAssetService.getActiveAsset(
      businessId,
      fileAssetId,
    );

    const updated = await this.fileAssetService.softDelete(asset.id);

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'file_asset.deleted',
      entityType: 'FileAsset',
      entityId: asset.id,
    });

    return toFileAssetResponse(updated);
  }

  async deleteOrphanPending(fileAssetId: string, businessId: string): Promise<void> {
    const asset = await this.fileAssetRepository.findByIdIncludingDeleted(
      businessId,
      fileAssetId,
    );
    if (!asset || asset.deletedAt) {
      return;
    }

    if (this.r2StorageProvider.isConfigured()) {
      try {
        await this.r2StorageProvider.deleteObject(asset.objectKey);
      } catch (err) {
        this.logger.warn(
          `R2 delete failed for ${asset.objectKey}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    await this.fileAssetService.softDelete(asset.id);
  }
}
