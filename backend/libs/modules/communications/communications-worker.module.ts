import { Module, forwardRef } from '@nestjs/common';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { ConversationsModule } from './conversations/conversations.module';
import { EmailModule } from './email/email.module';
import { SmsModule } from './sms/sms.module';
import { MetaWebhookProcessorModule } from './webhooks/meta-webhook-processor.module';
import { StripeWebhookProcessor } from './webhooks/workers/processors/stripe-webhook.processor';
import { SendMessageProcessorModule } from './messages/send-message-processor.module';

@Module({
  imports: [
    ConversationsModule,
    EmailModule,
    SmsModule,
    MetaWebhookProcessorModule,
    SendMessageProcessorModule,
    forwardRef(() => IntegrationsModule),
  ],
  providers: [StripeWebhookProcessor],
  exports: [
    MetaWebhookProcessorModule,
    SendMessageProcessorModule,
    StripeWebhookProcessor,
    EmailModule,
    SmsModule,
  ],
})
export class CommunicationsWorkerModule {}
