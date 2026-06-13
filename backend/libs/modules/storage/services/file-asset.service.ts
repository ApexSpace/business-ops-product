import { HttpStatus, Injectable } from '@nestjs/common';
import { FileAsset, FileAssetStatus } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import {
  ALLOWED_MIME_TYPES,
  CATEGORY_MIME_MAP,
  MAX_FILE_SIZE,
} from '../constants/storage.constants';
import { CreateUploadDto } from '../dto/create-upload.dto';
import {
  CreateFileAssetData,
  FileAssetRepository,
} from '../repositories/file-asset.repository';
import { StoragePathService } from './storage-path.service';

@Injectable()
export class FileAssetService {
  constructor(
    private readonly fileAssetRepository: FileAssetRepository,
    private readonly storagePathService: StoragePathService,
  ) {}

  validateUploadInput(dto: CreateUploadDto): void {
    if (dto.size > MAX_FILE_SIZE) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `File exceeds maximum size of ${MAX_FILE_SIZE} bytes`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(dto.mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `MIME type not allowed: ${dto.mimeType}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    this.assertCategoryMatchesMimeType(dto.category, dto.mimeType);
  }

  assertCategoryMatchesMimeType(
    category: CreateUploadDto['category'],
    mimeType: string,
  ): void {
    const allowedForCategory = CATEGORY_MIME_MAP[category];
    if (category === 'OTHER') {
      const coveredElsewhere = Object.entries(CATEGORY_MIME_MAP)
        .filter(([key]) => key !== 'OTHER')
        .flatMap(([, mimes]) => mimes);
      if (coveredElsewhere.includes(mimeType)) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          `MIME type ${mimeType} does not match category ${category}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      return;
    }

    if (!allowedForCategory.includes(mimeType)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `MIME type ${mimeType} does not match category ${category}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  buildPendingAssetData(
    businessId: string,
    uploadedById: string,
    dto: CreateUploadDto,
    fileAssetId: string,
  ): CreateFileAssetData {
    const filename = this.storagePathService.sanitizeFilename(dto.filename);
    const objectKey = this.storagePathService.buildObjectKey(
      businessId,
      fileAssetId,
      filename,
    );

    return {
      id: fileAssetId,
      businessId,
      uploadedById,
      originalName: dto.filename,
      filename,
      mimeType: dto.mimeType,
      size: dto.size,
      category: dto.category,
      objectKey,
      visibility: dto.visibility,
    };
  }

  async getActiveAsset(businessId: string, id: string): Promise<FileAsset> {
    const asset = await this.fileAssetRepository.findById(businessId, id);
    if (!asset) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'File not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return asset;
  }

  assertConfirmable(asset: FileAsset): void {
    if (
      asset.status !== FileAssetStatus.PENDING &&
      asset.status !== FileAssetStatus.FAILED
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `File cannot be confirmed in status ${asset.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  assertDownloadable(asset: FileAsset): void {
    if (asset.status !== FileAssetStatus.READY) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'File is not ready for download',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  assertFailAllowed(asset: FileAsset): void {
    if (
      asset.status !== FileAssetStatus.PENDING &&
      asset.status !== FileAssetStatus.FAILED
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        `File cannot be marked failed in status ${asset.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  markReady(id: string): Promise<FileAsset> {
    return this.fileAssetRepository.update(id, {
      status: FileAssetStatus.READY,
    });
  }

  markFailed(id: string, reason: string): Promise<FileAsset> {
    return this.fileAssetRepository.update(id, {
      status: FileAssetStatus.FAILED,
      metadata: { failReason: reason },
    });
  }

  softDelete(id: string): Promise<FileAsset> {
    return this.fileAssetRepository.update(id, {
      status: FileAssetStatus.DELETED,
      deletedAt: new Date(),
    });
  }
}
