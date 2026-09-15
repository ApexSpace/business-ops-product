import { Injectable } from '@nestjs/common';

@Injectable()
export class StoragePathService {
  sanitizeFilename(originalName: string): string {
    const base = originalName.split(/[/\\]/).pop()?.trim() || 'file';
    const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
    return sanitized.slice(0, 120) || 'file';
  }

  buildObjectKey(
    businessId: string,
    fileAssetId: string,
    safeFilename: string,
  ): string {
    return `businesses/${businessId}/files/${fileAssetId}-${safeFilename}`;
  }
}
