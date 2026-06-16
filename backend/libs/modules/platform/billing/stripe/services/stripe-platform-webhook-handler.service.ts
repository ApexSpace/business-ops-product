import { Injectable, Logger } from '@nestjs/common';
import { IdempotencyService } from '@app/core/idempotency/idempotency.service';
import type { StripeWebhookEvent } from '@app/modules/integrations/integrations/stripe/stripe.types';
import {
  PLATFORM_SUBSCRIPTION_PURPOSE,
  type StripeCheckoutSessionObject,
  type StripeInvoiceObject,
  type StripeSubscriptionObject,
} from '../types/stripe-platform-billing.types';
import { StripePlatformSyncService } from './stripe-platform-sync.service';

@Injectable()
export class StripePlatformWebhookHandlerService {
  private readonly logger = new Logger(
    StripePlatformWebhookHandlerService.name,
  );

  constructor(
    private readonly syncService: StripePlatformSyncService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  isPlatformSubscriptionMetadata(
    metadata: Record<string, string> | null | undefined,
  ): boolean {
    return this.syncService.isPlatformSubscriptionMetadata(metadata);
  }

  async handleEvent(event: StripeWebhookEvent): Promise<boolean> {
    switch (event.type) {
      case 'checkout.session.completed':
        return this.handleCheckoutSessionCompleted(event);
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        return this.handleSubscriptionUpdated(event);
      case 'customer.subscription.deleted':
        return this.handleSubscriptionDeleted(event);
      case 'invoice.paid':
        return this.handleInvoicePaid(event);
      case 'invoice.payment_failed':
        return this.handleInvoicePaymentFailed(event);
      default:
        return false;
    }
  }

  private async handleCheckoutSessionCompleted(
    event: StripeWebhookEvent,
  ): Promise<boolean> {
    const session = event.data.object as StripeCheckoutSessionObject;
    if (!this.isPlatformSubscriptionMetadata(session.metadata)) {
      return false;
    }

    const businessId = session.metadata?.businessId;
    const planGroupId = session.metadata?.planGroupId;
    const planTierId = session.metadata?.planTierId;
    const billingCycle = session.metadata?.billingCycle;

    if (!businessId || !planGroupId || !planTierId || !billingCycle) {
      this.logger.warn(
        `checkout.session.completed missing platform metadata (${event.id})`,
      );
      return true;
    }

    const processed = await this.claimIdempotency(
      'stripe-platform-checkout',
      session.id ?? event.id,
    );
    if (!processed) return true;

    return this.syncService.applyStripeCheckoutCompleted(session);
  }

  private async handleSubscriptionUpdated(
    event: StripeWebhookEvent,
  ): Promise<boolean> {
    const subscription = event.data.object as StripeSubscriptionObject;
    if (!this.isPlatformSubscriptionMetadata(subscription.metadata)) {
      return false;
    }

    const processed = await this.claimIdempotency(
      'stripe-platform-subscription',
      event.id,
    );
    if (!processed) return true;

    return this.syncService.applyStripeSubscriptionCreatedOrUpdated(
      subscription,
      { stripeEventId: event.id, stripeEventType: event.type },
    );
  }

  private async handleSubscriptionDeleted(
    event: StripeWebhookEvent,
  ): Promise<boolean> {
    const subscription = event.data.object as StripeSubscriptionObject;
    if (!this.isPlatformSubscriptionMetadata(subscription.metadata)) {
      return false;
    }

    const processed = await this.claimIdempotency(
      'stripe-platform-subscription-deleted',
      `${subscription.id ?? event.id}:deleted`,
    );
    if (!processed) return true;

    return this.syncService.applyStripeSubscriptionDeleted(subscription, {
      stripeEventId: event.id,
    });
  }

  private async handleInvoicePaid(event: StripeWebhookEvent): Promise<boolean> {
    const invoice = event.data.object as StripeInvoiceObject;
    const invoiceId = invoice.id ?? event.id;

    const processed = await this.claimIdempotency(
      'stripe-platform-invoice',
      invoiceId,
    );
    if (!processed) return true;

    return this.syncService.recordStripeInvoicePaid(invoice, {
      stripeEventId: event.id,
    });
  }

  private async handleInvoicePaymentFailed(
    event: StripeWebhookEvent,
  ): Promise<boolean> {
    const invoice = event.data.object as StripeInvoiceObject;
    const invoiceId = invoice.id ?? event.id;

    const processed = await this.claimIdempotency(
      'stripe-platform-invoice-failed',
      `${invoiceId}:failed`,
    );
    if (!processed) return true;

    return this.syncService.recordStripeInvoicePaymentFailed(invoice, {
      stripeEventId: event.id,
    });
  }

  private async claimIdempotency(scope: string, key: string): Promise<boolean> {
    return this.idempotencyService.claim(scope, key, 7 * 24 * 60 * 60);
  }
}

export { PLATFORM_SUBSCRIPTION_PURPOSE };
