import { Module, forwardRef } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { MetaWebhookProcessor } from './workers/processors/meta-webhook.processor';

@Module({
  imports: [forwardRef(() => ConversationsModule)],
  providers: [MetaWebhookProcessor],
  exports: [MetaWebhookProcessor],
})
export class MetaWebhookProcessorModule {}
