import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { StorageController } from './controllers/storage.controller';
import { R2StorageProvider } from './providers/r2-storage.provider';
import { FileAssetRepository } from './repositories/file-asset.repository';
import { FileAssetService } from './services/file-asset.service';
import { StoragePathService } from './services/storage-path.service';
import { StorageService } from './services/storage.service';

@Module({
  imports: [AuditModule],
  controllers: [StorageController],
  providers: [
    FileAssetRepository,
    FileAssetService,
    StoragePathService,
    R2StorageProvider,
    StorageService,
  ],
  exports: [StorageService, FileAssetRepository],
})
export class StorageModule {}
