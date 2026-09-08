import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { StripeWebhookEvent } from '@app/modules/integrations/integrations/stripe/stripe.types';
import {
  createStripeClient,
  getStripePublishableForMode,
  getStripeSecretForMode,
  isStripeModeConfigured,
  type StripePaymentsMode,
} from '@app/modules/integrations/integrations/stripe/utils/stripe-mode.util';

type StripeClient = InstanceType<typeof Stripe>;

@Injectable()
export class StripePlatformApiService {
  private readonly logger = new Logger(StripePlatformApiService.name);
  private readonly clients = new Map<StripePaymentsMode, StripeClient>();

  isConfigured(): boolean {
    return isStripeModeConfigured('live');
  }

  isModeConfigured(mode: StripePaymentsMode): boolean {
    return isStripeModeConfigured(mode);
  }

  getClient(): StripeClient {
    return this.getClientForMode('live');
  }

  getClientForMode(mode: StripePaymentsMode): StripeClient {
    const secret = getStripeSecretForMode(mode);
    if (!secret) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        mode === 'test'
          ? 'Stripe test mode is not configured. Set STRIPE_SECRET_KEY_TEST.'
          : 'Stripe is not configured. Set STRIPE_SECRET_KEY.',
        HttpStatus.BAD_REQUEST,
      );
    }

    let client = this.clients.get(mode);
    if (!client) {
      client = createStripeClient(secret);
      this.clients.set(mode, client);
    }
    return client;
  }

  getPublishableKeyForMode(mode: StripePaymentsMode): string | null {
    return getStripePublishableForMode(mode);
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
