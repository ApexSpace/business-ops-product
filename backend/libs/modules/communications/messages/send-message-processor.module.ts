import { Module, forwardRef } from '@nestjs/common';
import { IntegrationsModule } from '@app/modules/integrations/integrations/integrations.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { SendMessageProcessor } from './workers/processors/send-message.processor';

@Module({
  imports: [
    forwardRef(() => ConversationsModule),
    forwardRef(() => IntegrationsModule),
  ],
  providers: [SendMessageProcessor],
  exports: [SendMessageProcessor],
})
export class SendMessageProcessorModule {}
