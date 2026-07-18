import { Module, forwardRef } from '@nestjs/common';
import { ConversationsModule } from '@app/modules/communications/conversations/conversations.module';
import { WebhookEventsModule } from '@app/modules/communications/webhooks/webhook-events.module';
import { TwilioSmsWebhookController } from './controllers/twilio-sms-webhook.controller';
import { PlatformSmsSuppressionRepository } from './repositories/platform-sms-suppression.repository';
import { PlatformSmsComplianceService } from './services/platform-sms-compliance.service';
import { PlatformSmsSendService } from './services/platform-sms-send.service';
import { TwilioSmsWebhookDispatchService } from './services/twilio-sms-webhook-dispatch.service';
import { TwilioSmsWebhookService } from './services/twilio-sms-webhook.service';
import { TwilioSmsWebhookProcessor } from './workers/processors/twilio-sms-webhook.processor';
import { TwilioModule } from '@app/modules/integrations/twilio/twilio.module';

@Module({
  imports: [
    forwardRef(() => ConversationsModule),
    WebhookEventsModule,
    TwilioModule,
  ],
  controllers: [TwilioSmsWebhookController],
  providers: [
    PlatformSmsSuppressionRepository,
    PlatformSmsComplianceService,
    PlatformSmsSendService,
    TwilioSmsWebhookService,
    TwilioSmsWebhookDispatchService,
    TwilioSmsWebhookProcessor,
  ],
  exports: [
    PlatformSmsSendService,
    PlatformSmsComplianceService,
    TwilioSmsWebhookProcessor,
    TwilioSmsWebhookDispatchService,
    TwilioSmsWebhookService,
  ],
})
export class SmsModule {}
