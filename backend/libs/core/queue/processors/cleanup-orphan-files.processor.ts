import { Injectable, Logger } from '@nestjs/common';
import { FileAssetStatus } from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { StorageService } from '@app/core/storage/storage.service';
import type { CleanupOrphanFilesJobPayload } from '../queue.types';

@Injectable()
export class CleanupOrphanFilesProcessor {
  private readonly logger = new Logger(CleanupOrphanFilesProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async process(payload: CleanupOrphanFilesJobPayload): Promise<void> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - payload.pendingOlderThanHours);

    const orphans = await this.prisma.fileAsset.findMany({
      where: {
        status: FileAssetStatus.PENDING_UPLOAD,
        createdAt: { lt: cutoff },
        deletedAt: null,
      },
      take: 500,
    });

    for (const asset of orphans) {
      await this.storageService.deleteObject(asset.id, asset.businessId);
    }

    this.logger.log(
      `Cleanup orphan file assets: processed ${orphans.length} pending uploads older than ${payload.pendingOlderThanHours}h`,
    );
  }
}
