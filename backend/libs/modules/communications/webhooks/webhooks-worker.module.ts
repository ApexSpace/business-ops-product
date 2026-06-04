import { Module } from '@nestjs/common';
import { IntegrationsCategoryModule } from '@app/modules/integrations/integrations-category.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MetaWebhookProcessor } from './workers/processors/meta-webhook.processor';
import { StripeWebhookProcessor } from './workers/processors/stripe-webhook.processor';

@Module({
  imports: [ConversationsModule, IntegrationsCategoryModule],
  providers: [MetaWebhookProcessor, StripeWebhookProcessor],
  exports: [MetaWebhookProcessor, StripeWebhookProcessor],
})
export class WebhooksWorkerModule {}
