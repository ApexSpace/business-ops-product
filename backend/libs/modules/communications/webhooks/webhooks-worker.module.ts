import { Module } from '@nestjs/common';
import { IntegrationsCategoryModule } from '@app/modules/integrations/integrations-category.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MetaWebhookProcessorModule } from './meta-webhook-processor.module';
import { StripeWebhookProcessor } from './workers/processors/stripe-webhook.processor';

@Module({
  imports: [ConversationsModule, IntegrationsCategoryModule, MetaWebhookProcessorModule],
  providers: [StripeWebhookProcessor],
  exports: [MetaWebhookProcessorModule, StripeWebhookProcessor],
})
export class WebhooksWorkerModule {}
