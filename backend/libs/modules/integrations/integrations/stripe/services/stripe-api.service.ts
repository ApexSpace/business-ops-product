import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type {
  StripeConnectAccount,
  StripeWebhookEvent,
} from '../stripe.types';

type StripeClient = InstanceType<typeof Stripe>;

@Injectable()
export class StripeApiService {
  private readonly logger = new Logger(StripeApiService.name);
  private client: StripeClient | null = null;

  isConfigured(): boolean {
    return (
      (process.env.STRIPE_CONNECT_ENABLED ?? 'false').toLowerCase() ===
        'true' &&
      !!process.env.STRIPE_SECRET_KEY?.trim() &&
      !!process.env.STRIPE_CLIENT_ID?.trim() &&
      !!this.getRedirectUri()
    );
  }

  getClient(): StripeClient {
    if (!this.isConfigured()) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe Connect is not configured. Please set STRIPE_SECRET_KEY, STRIPE_CLIENT_ID, and STRIPE_REDIRECT_URI.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!this.client) {
      const apiVersion =
        process.env.STRIPE_API_VERSION?.trim() || '2025-05-28.basil';
      this.client = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
        // Stripe SDK accepts version strings; env allows pinning e.g. 2025-05-28.basil
        apiVersion: apiVersion as never,
      });
    }

    return this.client;
  }

  getClientId(): string {
    const value = process.env.STRIPE_CLIENT_ID?.trim();
    if (!value) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe Connect is not configured. Please set STRIPE_SECRET_KEY, STRIPE_CLIENT_ID, and STRIPE_REDIRECT_URI.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return value;
  }

  getRedirectUri(): string {
    return (
      process.env.STRIPE_REDIRECT_URI?.trim() ||
      'http://localhost:3000/api/v1/integrations/oauth/stripe/callback'
    );
  }

  getPlatformWebhookSecret(): string | null {
    return process.env.STRIPE_WEBHOOK_SECRET_PLATFORM?.trim() || null;
  }

  getConnectedAccountWebhookSecret(): string | null {
    return process.env.STRIPE_WEBHOOK_SECRET_CONNECTED_ACCOUNT?.trim() || null;
  }

  async retrieveConnectedAccount(
    stripeAccountId: string,
  ): Promise<StripeConnectAccount> {
    const stripe = this.getClient();
    const account = await stripe.accounts.retrieve(stripeAccountId);
    return account as unknown as StripeConnectAccount;
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
    this.logger.warn(`Stripe ${context}: ${message}`);
  }
}
