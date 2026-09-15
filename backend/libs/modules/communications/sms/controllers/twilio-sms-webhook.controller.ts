import {
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '@app/common/decorators/public.decorator';
import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';
import { TwilioSmsWebhookDispatchService } from '../services/twilio-sms-webhook-dispatch.service';
import { TwilioSmsWebhookService } from '../services/twilio-sms-webhook.service';

@ApiTags('webhooks')
@Controller('webhooks/twilio/sms')
export class TwilioSmsWebhookController {
  private readonly logger = new Logger(TwilioSmsWebhookController.name);

  constructor(
    private readonly twilioSmsWebhookService: TwilioSmsWebhookService,
    private readonly twilioSmsWebhookDispatch: TwilioSmsWebhookDispatchService,
  ) {}

  @Post()
  @Public()
  @SkipEnvelope()
  @HttpCode(200)
  async receiveInbound(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('x-twilio-signature') signature: string | undefined,
  ): Promise<void> {
    const params = this.readFormParams(req);
    const url = this.buildRequestUrl(req);
    const accountSid = params.AccountSid;

    const valid =
      (accountSid &&
        (await this.twilioSmsWebhookService.validateBusinessSignature(
          signature,
          url,
          params,
          accountSid,
        ))) ||
      this.twilioSmsWebhookService.validateSignature(signature, url, params);

    if (!valid) {
      res.status(403).send('Forbidden');
      return;
    }

    const webhookEventId = await this.twilioSmsWebhookService.persistAndEnqueue({
      eventType: params.MessageStatus ? 'sms.status' : 'sms.inbound',
      payload: params,
      externalEventId: params.MessageSid,
    });

    if (params.MessageStatus) {
      void this.twilioSmsWebhookDispatch
        .dispatch(webhookEventId)
        .catch((error) => this.logError(error));
      res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      return;
    }

    if (
      (await this.twilioSmsWebhookService.isOneWayInbound(params.To)) &&
      this.twilioSmsWebhookService.isComplianceKeyword(params.Body)
    ) {
      const twiml = await this.twilioSmsWebhookService.processWebhookEvent(
        webhookEventId,
      );
      res.type('text/xml').send(twiml ?? '<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      return;
    }

    void this.twilioSmsWebhookDispatch
      .dispatch(webhookEventId)
      .catch((error) => this.logError(error));
    res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }

  @Post('status')
  @Public()
  @SkipEnvelope()
  @HttpCode(200)
  async receiveStatus(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('x-twilio-signature') signature: string | undefined,
  ): Promise<void> {
    const params = this.readFormParams(req);
    const url = this.buildRequestUrl(req);
    const accountSid = params.AccountSid;

    const valid =
      (accountSid &&
        (await this.twilioSmsWebhookService.validateBusinessSignature(
          signature,
          url,
          params,
          accountSid,
        ))) ||
      this.twilioSmsWebhookService.validateSignature(signature, url, params);

    if (!valid) {
      res.status(403).send('Forbidden');
      return;
    }

    const webhookEventId = await this.twilioSmsWebhookService.persistAndEnqueue({
      eventType: 'sms.status',
      payload: params,
      externalEventId: params.MessageSid
        ? `${params.MessageSid}:${params.MessageStatus ?? 'unknown'}`
        : undefined,
    });

    void this.twilioSmsWebhookDispatch
      .dispatch(webhookEventId)
      .catch((error) => this.logError(error));
    res.status(200).send('OK');
  }

  private readFormParams(req: Request): Record<string, string> {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return {};
    }
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') {
        params[key] = value;
      }
    }
    return params;
  }

  private buildRequestUrl(req: Request): string {
    const protocol = req.headers['x-forwarded-proto'] ?? req.protocol;
    const host = req.headers['x-forwarded-host'] ?? req.get('host');
    return `${protocol}://${host}${req.originalUrl}`;
  }

  private logError(error: unknown): void {
    const message =
      error instanceof Error ? error.message : 'Twilio SMS webhook failed';
    this.logger.error(message);
  }
}
