import { Module } from '@nestjs/common';
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
import { ResendWebhookService } from './services/resend-webhook.service';
import { ResendWebhookProcessor } from './workers/processors/resend-webhook.processor';
import { SendEmailProcessor } from './workers/processors/send-email.processor';

@Module({
  imports: [WebhookEventsModule, IdempotencyModule],
  controllers: [EmailNotificationsController, ResendWebhookController],
  providers: [
    BusinessEmailPreferenceRepository,
    EmailTemplateRepository,
    EmailMessageRepository,
    EmailTemplateRendererService,
    ResendProviderService,
    EmailNotificationService,
    EmailPreferenceService,
    EmailTemplateService,
    EmailLogsService,
    ResendWebhookService,
    SendEmailProcessor,
    ResendWebhookProcessor,
  ],
  exports: [
    EmailNotificationService,
    SendEmailProcessor,
    ResendWebhookProcessor,
  ],
})
export class EmailModule {}
