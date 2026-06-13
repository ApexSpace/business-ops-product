import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { StripeWebhookEvent } from '@app/modules/integrations/integrations/stripe/stripe.types';

type StripeClient = InstanceType<typeof Stripe>;

@Injectable()
export class StripePlatformApiService {
  private readonly logger = new Logger(StripePlatformApiService.name);
  private client: StripeClient | null = null;

  isConfigured(): boolean {
    return !!process.env.STRIPE_SECRET_KEY?.trim();
  }

  getClient(): StripeClient {
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe is not configured. Set STRIPE_SECRET_KEY.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!this.client) {
      const apiVersion =
        process.env.STRIPE_API_VERSION?.trim() || '2025-05-28.basil';
      this.client = new Stripe(secret, {
        apiVersion: apiVersion as never,
      });
    }

    return this.client;
  }

  getPlatformWebhookSecret(): string | null {
    return (
      process.env.STRIPE_PLATFORM_WEBHOOK_SECRET?.trim() ||
      process.env.STRIPE_WEBHOOK_SECRET_PLATFORM?.trim() ||
      null
    );
  }

  constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
    secret: string,
  ): StripeWebhookEvent {
    const stripe = this.getClient();
    const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    return event as unknown as StripeWebhookEvent;
  }

  logStripeError(context: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Stripe platform ${context}: ${message}`);
  }
}
