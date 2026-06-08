import { Module } from '@nestjs/common';
import { AuditModule } from '@app/modules/platform/audit/audit.module';
import { BusinessSnapshotContextController } from './controllers/business-snapshot-context.controller';
import { PlatformSnapshotsController } from './controllers/platform-snapshots.controller';
import { SnapshotRepository } from './repositories/snapshot.repository';
import { SnapshotApplyService } from './services/snapshot-apply.service';
import { SnapshotContextService } from './services/snapshot-context.service';
import { SnapshotValidationService } from './services/snapshot-validation.service';
import { SnapshotsService } from './services/snapshots.service';

@Module({
  imports: [AuditModule],
  controllers: [PlatformSnapshotsController, BusinessSnapshotContextController],
  providers: [
    SnapshotsService,
    SnapshotApplyService,
    SnapshotContextService,
    SnapshotValidationService,
    SnapshotRepository,
  ],
  exports: [
    SnapshotsService,
    SnapshotApplyService,
    SnapshotContextService,
    SnapshotRepository,
  ],
})
export class SnapshotsModule {}
