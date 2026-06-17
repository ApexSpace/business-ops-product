import { Module } from '@nestjs/common';
import { AutomationsModule } from './automations/automations.module';
import { ChatbotsModule } from './chatbots/chatbots.module';
import { ConversationsModule } from './conversations/conversations.module';
import { EmailModule } from './email/email.module';
import { FormsModule } from './forms/forms.module';

@Module({
  imports: [
    ConversationsModule,
    ChatbotsModule,
    EmailModule,
    FormsModule,
    AutomationsModule,
  ],
  exports: [
    ConversationsModule,
    ChatbotsModule,
    EmailModule,
    FormsModule,
    AutomationsModule,
  ],
})
export class CommunicationsModule {}
