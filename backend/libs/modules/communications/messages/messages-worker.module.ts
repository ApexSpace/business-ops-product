import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { SendMessageProcessor } from './workers/processors/send-message.processor';

@Module({
  imports: [ConversationsModule],
  providers: [SendMessageProcessor],
  exports: [SendMessageProcessor],
})
export class MessagesWorkerModule {}
