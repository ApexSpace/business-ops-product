import { Global, Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { AsyncJobRepository } from './async-job.repository';
import { JobEnqueueService } from './job-enqueue.service';

@Global()
@Module({
  imports: [QueueModule],
  providers: [AsyncJobRepository, JobEnqueueService],
  exports: [AsyncJobRepository, JobEnqueueService],
})
export class JobEnqueueModule {}
