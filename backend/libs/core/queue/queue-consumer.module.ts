import { Module } from '@nestjs/common';
import { CommunicationsWorkerModule } from '@app/modules/communications/communications-worker.module';
import { QueueConsumerService } from './queue-consumer.service';

@Module({
  imports: [CommunicationsWorkerModule],
  providers: [QueueConsumerService],
})
export class QueueConsumerModule {}
