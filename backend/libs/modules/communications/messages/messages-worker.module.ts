import { Module } from '@nestjs/common';
import { SendMessageProcessorModule } from './send-message-processor.module';

@Module({
  imports: [SendMessageProcessorModule],
  exports: [SendMessageProcessorModule],
})
export class MessagesWorkerModule {}
