import { Module } from '@nestjs/common';
import { CommunicationsWorkerModule } from '@app/modules/communications/communications-worker.module';
import { AutomationsWorkerModule } from '@app/modules/communications/automations/automations-worker.module';
import { SyncProcessorsModule } from './sync-processors.module';
import { QueueWorkersService } from './queue-workers.service';

@Module({
  imports: [
    CommunicationsWorkerModule,
    AutomationsWorkerModule,
    SyncProcessorsModule,
  ],
  providers: [QueueWorkersService],
  exports: [QueueWorkersService],
})
export class QueueWorkersModule {}
