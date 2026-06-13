import { Module, forwardRef } from '@nestjs/common';
import { WhatsAppModule } from '@app/modules/integrations/whatsapp/whatsapp.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MetaWebhookProcessor } from './workers/processors/meta-webhook.processor';

@Module({
  imports: [forwardRef(() => ConversationsModule), WhatsAppModule],
  providers: [MetaWebhookProcessor],
  exports: [MetaWebhookProcessor],
})
export class MetaWebhookProcessorModule {}
