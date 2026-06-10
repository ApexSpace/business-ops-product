import { Module, forwardRef } from '@nestjs/common';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { ConversationsModule } from './conversations/conversations.module';
import { EmailModule } from './email/email.module';
import { MetaWebhookProcessor } from './webhooks/workers/processors/meta-webhook.processor';
import { StripeWebhookProcessor } from './webhooks/workers/processors/stripe-webhook.processor';
import { SendMessageProcessor } from './messages/workers/processors/send-message.processor';

@Module({
  imports: [
    ConversationsModule,
    EmailModule,
    forwardRef(() => IntegrationsModule),
  ],
  providers: [
    MetaWebhookProcessor,
    StripeWebhookProcessor,
    SendMessageProcessor,
  ],
  exports: [
    MetaWebhookProcessor,
    StripeWebhookProcessor,
    SendMessageProcessor,
    EmailModule,
  ],
})
export class CommunicationsWorkerModule {}
