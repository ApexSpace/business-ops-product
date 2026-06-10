import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '@app/common/decorators/public.decorator';
import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';
import { StripeWebhookService } from '@app/modules/integrations/integrations/stripe/services/stripe-webhook.service';

@ApiTags('webhooks')
@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(private readonly stripeWebhookService: StripeWebhookService) {}

  @Post('platform')
  @Public()
  @SkipEnvelope()
  @HttpCode(200)
  handlePlatform(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): { received: true } {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error('Raw body is required for Stripe webhook verification');
    }
    void this.stripeWebhookService.handlePlatformWebhook(rawBody, signature);
    return { received: true };
  }

  @Post('connect')
  @Public()
  @SkipEnvelope()
  @HttpCode(200)
  handleConnect(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): { received: true } {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new Error('Raw body is required for Stripe webhook verification');
    }
    void this.stripeWebhookService.handleConnectedAccountWebhook(
      rawBody,
      signature,
    );
    return { received: true };
  }
}
