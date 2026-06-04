import { Injectable } from '@nestjs/common';
import { StorageService } from '@app/core/storage/storage.service';
import { CreateUploadIntentDto } from '../presentation/dto/create-upload-intent.dto';

@Injectable()
export class FilesService {
  constructor(private readonly storageService: StorageService) {}

  createUploadIntent(
    businessId: string,
    ownerId: string,
    dto: CreateUploadIntentDto,
  ) {
    return this.storageService.createUploadIntent({
      businessId,
      ownerId,
      originalName: dto.originalName,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      entityType: dto.entityType,
      entityId: dto.entityId,
    });
  }

  confirmUpload(businessId: string, ownerId: string, fileAssetId: string) {
    return this.storageService.confirmUpload(businessId, fileAssetId, ownerId);
  }

  getDownloadUrl(businessId: string, ownerId: string, fileAssetId: string) {
    return this.storageService.getSignedDownloadUrl(
      businessId,
      fileAssetId,
      ownerId,
    );
  }
}
