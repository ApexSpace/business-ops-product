import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RootConfig } from '@app/core/config/configuration';
import { JobEnqueueService } from '@app/core/jobs/job-enqueue.service';
import { TwilioSmsWebhookProcessor } from '../workers/processors/twilio-sms-webhook.processor';

@Injectable()
export class TwilioSmsWebhookDispatchService {
  private readonly logger = new Logger(TwilioSmsWebhookDispatchService.name);

  constructor(
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly jobEnqueueService: JobEnqueueService,
    private readonly twilioSmsWebhookProcessor: TwilioSmsWebhookProcessor,
  ) {}

  async dispatch(webhookEventId: string): Promise<void> {
    const jobId = await this.jobEnqueueService.enqueueTwilioSmsWebhook({
      webhookEventId,
    });

    if (jobId) {
      return;
    }

    const nodeEnv = this.configService.get('app.nodeEnv', { infer: true });
    if (nodeEnv === 'production') {
      this.logger.warn(
        `Twilio SMS webhook ${webhookEventId} queued without Redis in production`,
      );
      return;
    }

    await this.twilioSmsWebhookProcessor.process({ webhookEventId });
  }
}
