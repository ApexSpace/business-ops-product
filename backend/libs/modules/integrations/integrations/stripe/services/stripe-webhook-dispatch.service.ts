import { Injectable, Logger } from '@nestjs/common';
import { IntegrationStatus, Prisma } from '@prisma/client';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { WebhookEventsRepository } from '@app/modules/communications/conversations/repositories/webhook-events.repository';
import { StripePlatformWebhookHandlerService } from '@app/modules/platform/billing/stripe/services/stripe-platform-webhook-handler.service';
import { BusinessIntegrationRepository } from '../../repositories/business-integration.repository';
import type { StripeConnectAccount, StripeWebhookEvent } from '../stripe.types';
import { StripeInvoicePaymentService } from '@app/modules/finance/invoices/services/stripe-invoice-payment.service';
import { MembershipWebhookService } from '@app/modules/finance/memberships/services/membership-webhook.service';
import { StripeAccountService } from './stripe-account.service';
import { StripeApiService } from './stripe-api.service';
import { PLATFORM_SUBSCRIPTION_PURPOSE } from '@app/modules/platform/billing/stripe/types/stripe-platform-billing.types';

@Injectable()
export class StripeWebhookDispatchService {
  private readonly logger = new Logger(StripeWebhookDispatchService.name);

  constructor(
    private readonly stripeApiService: StripeApiService,
    private readonly stripeAccountService: StripeAccountService,
    private readonly businessIntegrationRepository: BusinessIntegrationRepository,
    private readonly auditService: AuditService,
    private readonly webhookEventsRepository: WebhookEventsRepository,
    private readonly stripeInvoicePaymentService: StripeInvoicePaymentService,
    private readonly membershipWebhookService: MembershipWebhookService,
    private readonly platformWebhookHandler: StripePlatformWebhookHandlerService,
  ) {}

  async dispatchStoredEvent(
    webhookEventId: string,
    source: 'platform' | 'connected',
  ): Promise<void> {
    const stored = await this.webhookEventsRepository.findById(webhookEventId);
    if (!stored?.payload) {
      throw new Error(`Stripe webhook payload missing for ${webhookEventId}`);
    }
    const event = stored.payload as unknown as StripeWebhookEvent;
    await this.dispatchEvent(event, source);
  }

  async dispatchEvent(
    event: StripeWebhookEvent,
    source: 'platform' | 'connected',
  ): Promise<void> {
    this.logger.log(`Stripe webhook [${source}]: ${event.type} (${event.id})`);

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      action: 'stripe.webhook.received',
      entityType: 'StripeWebhook',
      entityId: event.id,
      metadata: {
        type: event.type,
        source,
        livemode: event.livemode,
      },
    });

    if (await this.tryDispatchPlatformBilling(event, source)) {
      return;
    }

    switch (event.type) {
      case 'account.updated':
        await this.handleAccountUpdated(event);
        break;
      case 'account.application.authorized':
        await this.handleAccountAuthorized(event);
        break;
      case 'account.application.deauthorized':
        await this.handleAccountDeauthorized(event);
        break;
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event);
        break;
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event);
        break;
      case 'setup_intent.succeeded':
        await this.handleSetupIntentSucceeded(event);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  private async tryDispatchPlatformBilling(
    event: StripeWebhookEvent,
    source: 'platform' | 'connected',
  ): Promise<boolean> {
    if (source !== 'platform') {
      return false;
    }

    const platformTypes = new Set([
      'checkout.session.completed',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.paid',
      'invoice.payment_failed',
      'setup_intent.succeeded',
    ]);

    if (!platformTypes.has(event.type)) {
      return false;
    }

    const object = event.data.object as { metadata?: Record<string, string> };
    const metadata = object.metadata ?? null;

    const subscriptionObjectTypes = new Set([
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.paid',
      'invoice.payment_failed',
    ]);

    if (
      event.type === 'checkout.session.completed' &&
      metadata?.purpose !== PLATFORM_SUBSCRIPTION_PURPOSE
    ) {
      return false;
    }

    if (
      subscriptionObjectTypes.has(event.type) &&
      metadata?.purpose !== PLATFORM_SUBSCRIPTION_PURPOSE
    ) {
      const invoice = event.data.object as {
        subscription?: string | { id?: string } | null;
      };
      if (event.type.startsWith('invoice.') && invoice.subscription) {
        const handled = await this.platformWebhookHandler.handleEvent(event);
        return handled;
      }
      return false;
    }

    const handled = await this.platformWebhookHandler.handleEvent(event);
    return handled;
  }

  private async handleAccountUpdated(event: StripeWebhookEvent): Promise<void> {
    const account = event.data.object as unknown as StripeConnectAccount;
    const integration =
      await this.stripeAccountService.findIntegrationByStripeAccountId(
        account.id,
      );
    if (!integration) {
      this.logger.warn(
        `account.updated: no integration for Stripe account ${account.id}`,
      );
      return;
    }

    const config = integration.config as Record<string, unknown> | null;
    const livemode =
      typeof config?.livemode === 'boolean' ? config.livemode : false;

    await this.stripeAccountService.persistAccountSnapshot(
      integration.id,
      integration.businessId,
      account,
      livemode,
    );

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: integration.businessId,
      action: 'stripe.account.updated',
      entityType: 'BusinessIntegration',
      entityId: integration.id,
      metadata: { stripeAccountId: account.id, eventId: event.id },
    });
  }

  private async handleAccountAuthorized(
    event: StripeWebhookEvent,
  ): Promise<void> {
    const application = event.data.object as { account?: string };
    const accountId = application.account;
    if (!accountId) return;
    const integration =
      await this.stripeAccountService.findIntegrationByStripeAccountId(
        accountId,
      );
    if (!integration) return;

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: integration.businessId,
      action: 'stripe.connected',
      entityType: 'BusinessIntegration',
      entityId: integration.id,
      metadata: { stripeAccountId: accountId, via: 'webhook' },
    });
  }

  private async handleAccountDeauthorized(
    event: StripeWebhookEvent,
  ): Promise<void> {
    const application = event.data.object as { account?: string };
    const accountId = application.account;
    if (!accountId) return;

    const integration =
      await this.stripeAccountService.findIntegrationByStripeAccountId(
        accountId,
      );
    if (!integration) {
      this.logger.warn(
        `account.application.deauthorized: no integration for ${accountId}`,
      );
      return;
    }

    await this.businessIntegrationRepository.update(
      integration.businessId,
      'stripe',
      {
        status: IntegrationStatus.EXPIRED,
        errorMessage:
          'Stripe disconnected. Reconnect to accept payments again.',
      },
    );

    await this.auditService.log({
      actorUserId: SYSTEM_AUDIT_ACTOR_SENTINEL,
      businessId: integration.businessId,
      action: 'stripe.disconnected',
      entityType: 'BusinessIntegration',
      entityId: integration.id,
      metadata: { stripeAccountId: accountId, eventId: event.id },
    });
  }

  private async handleCheckoutSessionCompleted(
    event: StripeWebhookEvent,
  ): Promise<void> {
    await this.stripeInvoicePaymentService.handleCheckoutSessionCompleted(
      event,
    );
  }

  private async handlePaymentIntentSucceeded(
    event: StripeWebhookEvent,
  ): Promise<void> {
    await this.stripeInvoicePaymentService.handlePaymentIntentSucceeded(event);
  }

  private async handleSetupIntentSucceeded(
    event: StripeWebhookEvent,
  ): Promise<void> {
    await this.stripeInvoicePaymentService.handleSetupIntentSucceeded(event);
  }

  private async handlePaymentIntentFailed(
    event: StripeWebhookEvent,
  ): Promise<void> {
    await this.stripeInvoicePaymentService.handlePaymentIntentFailed(event);
  }

  private async handleInvoicePaymentSucceeded(
    event: StripeWebhookEvent,
  ): Promise<void> {
    const handled =
      await this.membershipWebhookService.handleInvoicePaymentSucceeded(event);
    if (handled) return;
    this.logger.debug(`invoice.payment_succeeded not handled for ${event.id}`);
  }

  private async handleInvoicePaymentFailed(
    event: StripeWebhookEvent,
  ): Promise<void> {
    const handled =
      await this.membershipWebhookService.handleInvoicePaymentFailed(event);
    if (handled) return;
    this.logger.debug(`invoice.payment_failed not handled for ${event.id}`);
  }

  private async handleSubscriptionUpdated(
    event: StripeWebhookEvent,
  ): Promise<void> {
    await this.membershipWebhookService.handleSubscriptionUpdated(event);
  }

  private async handleSubscriptionDeleted(
    event: StripeWebhookEvent,
  ): Promise<void> {
    await this.membershipWebhookService.handleSubscriptionDeleted(event);
  }

  private async handleChargeRefunded(event: StripeWebhookEvent): Promise<void> {
    await this.stripeInvoicePaymentService.handleChargeRefunded(event);
  }
}
