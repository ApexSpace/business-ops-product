import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import type { StripeConnectAccount, StripeWebhookEvent } from '../stripe.types';
import {
  createStripeClient,
  getStripePublishableForMode,
  getStripeSecretForMode,
  isStripeModeConfigured,
  type StripePaymentsMode,
} from '../utils/stripe-mode.util';

type StripeClient = InstanceType<typeof Stripe>;

@Injectable()
export class StripeApiService {
  private readonly logger = new Logger(StripeApiService.name);
  private readonly clients = new Map<StripePaymentsMode, StripeClient>();

  isConfigured(): boolean {
    return (
      (process.env.STRIPE_CONNECT_ENABLED ?? 'false').toLowerCase() ===
        'true' &&
      !!getStripeSecretForMode('live') &&
      !!process.env.STRIPE_CLIENT_ID?.trim() &&
      !!this.getRedirectUri()
    );
  }

  /** Default client uses live (or primary) secret — OAuth and Connect admin. */
  getClient(): StripeClient {
    return this.getClientForMode('live');
  }

  getClientForMode(mode: StripePaymentsMode): StripeClient {
    if (
      mode === 'live' &&
      (process.env.STRIPE_CONNECT_ENABLED ?? 'false').toLowerCase() !== 'true'
    ) {
      // Still allow live client when only secret is set (non-connect callers).
    } else if (
      mode === 'live' &&
      !this.isConfigured() &&
      !getStripeSecretForMode('live')
    ) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Stripe Connect is not configured. Please set STRIPE_SECRET_KEY, STRIPE_CLIENT_ID, and STRIPE_REDIRECT_URI.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const secret = getStripeSecretForMode(mode);
    if (!secret) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        mode === 'test'
          ? 'Stripe test mode is not configured. Set STRIPE_SECRET_KEY_TEST (and STRIPE_PUBLISHABLE_KEY_TEST).'
          : 'Stripe Connect is not configured. Please set STRIPE_SECRET_KEY, STRIPE_CLIENT_ID, and STRIPE_REDIRECT_URI.',
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

  isModeConfigured(mode: StripePaymentsMode): boolean {
    return isStripeModeConfigured(mode);
  }

  getPublishableKeyForMode(mode: StripePaymentsMode): string | null {
    return getStripePublishableForMode(mode);
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
    return (
      process.env.STRIPE_PLATFORM_WEBHOOK_SECRET?.trim() ||
      process.env.STRIPE_WEBHOOK_SECRET_PLATFORM?.trim() ||
      null
    );
  }

  getConnectedAccountWebhookSecret(): string | null {
    return (
      process.env.STRIPE_CONNECT_WEBHOOK_SECRET?.trim() ||
      process.env.STRIPE_WEBHOOK_SECRET_CONNECTED_ACCOUNT?.trim() ||
      null
    );
  }

  async retrieveConnectedAccount(
    stripeAccountId: string,
  ): Promise<StripeConnectAccount> {
    const stripe = this.getClient();
    const account = await stripe.accounts.retrieve(stripeAccountId);
    return account;
  }

  async createAccountOnboardingLink(
    stripeAccountId: string,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<string> {
    const stripe = this.getClient();
    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    return link.url;
  }

  async createAccountLoginLink(stripeAccountId: string): Promise<string> {
    const stripe = this.getClient();
    const link = await stripe.accounts.createLoginLink(stripeAccountId);
    return link.url;
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
