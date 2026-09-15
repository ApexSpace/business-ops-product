import { FileAsset } from '@prisma/client';
import { FileAssetResponseDto } from '../dto/file-asset-response.dto';

export function toFileAssetResponse(asset: FileAsset): FileAssetResponseDto {
  return {
    id: asset.id,
    originalName: asset.originalName,
    filename: asset.filename,
    mimeType: asset.mimeType,
    size: asset.size,
    category: asset.category,
    status: asset.status,
    visibility: asset.visibility,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}
