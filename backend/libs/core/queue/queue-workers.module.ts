import { Module } from '@nestjs/common';
import { CommunicationsWorkerModule } from '@app/modules/communications/communications-worker.module';
import { SyncProcessorsModule } from './sync-processors.module';
import { QueueWorkersService } from './queue-workers.service';

@Module({
  imports: [CommunicationsWorkerModule, SyncProcessorsModule],
  providers: [QueueWorkersService],
  exports: [QueueWorkersService],
})
export class QueueWorkersModule {}
