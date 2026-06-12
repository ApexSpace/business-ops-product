import { Module } from '@nestjs/common';
import { ChatbotsModule } from './chatbots/chatbots.module';
import { ConversationsModule } from './conversations/conversations.module';
import { EmailModule } from './email/email.module';
import { FormsModule } from './forms/forms.module';

@Module({
  imports: [ConversationsModule, ChatbotsModule, EmailModule, FormsModule],
  exports: [ConversationsModule, ChatbotsModule, EmailModule, FormsModule],
})
export class CommunicationsModule {}
