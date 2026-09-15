import { Module } from '@nestjs/common';
import { AutomationsModule } from './automations/automations.module';
import { ChatbotsModule } from './chatbots/chatbots.module';
import { ConversationsModule } from './conversations/conversations.module';
import { EmailModule } from './email/email.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SmsModule } from './sms/sms.module';
import { FormsModule } from './forms/forms.module';
import { SocialPlannerModule } from './social-planner/social-planner.module';

@Module({
  imports: [
    ConversationsModule,
    ChatbotsModule,
    EmailModule,
    NotificationsModule,
    SmsModule,
    FormsModule,
    AutomationsModule,
    SocialPlannerModule,
  ],
  exports: [
    ConversationsModule,
    ChatbotsModule,
    EmailModule,
    NotificationsModule,
    SmsModule,
    FormsModule,
    AutomationsModule,
    SocialPlannerModule,
  ],
})
export class CommunicationsModule {}
