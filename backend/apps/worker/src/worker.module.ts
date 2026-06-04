import { Module } from '@nestjs/common';
import { CoreModule } from '@app/core/core.module';
import { QueueWorkersModule } from '@app/core/queue/queue-workers.module';
import { IntegrationsWorkerModule } from '@app/modules/integrations/integrations-worker.module';
import { OperationsWorkerModule } from '@app/modules/operations/operations-worker.module';

@Module({
  imports: [
    CoreModule,
    QueueWorkersModule,
    IntegrationsWorkerModule,
    OperationsWorkerModule,
  ],
})
export class WorkerModule {}
