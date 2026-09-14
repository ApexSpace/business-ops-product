import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '@app/common/decorators/public.decorator';
import { SkipEnvelope } from '@app/common/decorators/skip-envelope.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
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
  async handleConnect(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Raw body is required for Stripe webhook verification',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await this.stripeWebhookService.handleConnectedAccountWebhook(
        rawBody,
        signature,
      );
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      throw new AppException(
        ErrorCode.INTERNAL_ERROR,
        'Failed to persist Stripe Connect webhook',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return { received: true };
  }
}
