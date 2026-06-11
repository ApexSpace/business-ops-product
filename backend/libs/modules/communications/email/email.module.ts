import { Module, forwardRef } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { IdempotencyModule } from '@app/core/idempotency/idempotency.module';
import { WebhookEventsModule } from '../webhooks/webhook-events.module';
import {
  EmailNotificationsController,
  ResendWebhookController,
} from './controllers/email-notifications.controller';
import { BusinessEmailPreferenceRepository } from './repositories/business-email-preference.repository';
import { EmailMessageRepository } from './repositories/email-message.repository';
import { EmailTemplateRepository } from './repositories/email-template.repository';
import {
  EmailNotificationService,
  EmailPreferenceService,
} from './services/email-notification.service';
import { EmailTemplateRendererService } from './services/email-template-renderer.service';
import {
  EmailLogsService,
  EmailTemplateService,
} from './services/email-template.service';
import { ResendProviderService } from './services/resend-provider.service';
import { ResendInboundEmailService } from './services/resend-inbound-email.service';
import { ResendWebhookDispatchService } from './services/resend-webhook-dispatch.service';
import { ResendWebhookRecoveryService } from './services/resend-webhook-recovery.service';
import { ResendWebhookService } from './services/resend-webhook.service';
import { ResendWebhookProcessor } from './workers/processors/resend-webhook.processor';
import { SendEmailProcessor } from './workers/processors/send-email.processor';

@Module({
  imports: [WebhookEventsModule, IdempotencyModule, forwardRef(() => ConversationsModule)],
  controllers: [EmailNotificationsController, ResendWebhookController],
  providers: [
    BusinessEmailPreferenceRepository,
    EmailTemplateRepository,
    EmailMessageRepository,
    EmailTemplateRendererService,
    ResendProviderService,
    ResendInboundEmailService,
    EmailNotificationService,
    EmailPreferenceService,
    EmailTemplateService,
    EmailLogsService,
    ResendWebhookService,
    ResendWebhookDispatchService,
    ResendWebhookRecoveryService,
    SendEmailProcessor,
    ResendWebhookProcessor,
  ],
  exports: [
    EmailNotificationService,
    ResendProviderService,
    SendEmailProcessor,
    ResendWebhookProcessor,
  ],
})
export class EmailModule {}
