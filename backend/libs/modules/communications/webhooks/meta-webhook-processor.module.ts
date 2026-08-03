import { Module, forwardRef } from '@nestjs/common';
import { WhatsAppModule } from '@app/modules/integrations/whatsapp/whatsapp.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { SocialPlannerWorkerModule } from '../social-planner/social-planner.module';
import { MetaWebhookProcessor } from './workers/processors/meta-webhook.processor';

@Module({
  imports: [
    forwardRef(() => ConversationsModule),
    WhatsAppModule,
    forwardRef(() => SocialPlannerWorkerModule),
  ],
  providers: [MetaWebhookProcessor],
  exports: [MetaWebhookProcessor],
})
export class MetaWebhookProcessorModule {}
