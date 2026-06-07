import { Module } from '@nestjs/common';
import { ChatbotsModule } from './chatbots/chatbots.module';
import { ConversationsModule } from './conversations/conversations.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [ConversationsModule, ChatbotsModule, EmailModule],
  exports: [ConversationsModule, ChatbotsModule, EmailModule],
})
export class CommunicationsModule {}
