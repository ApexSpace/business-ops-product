import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import {
  BusinessStatus,
  BusinessSubscriptionBillingCycle,
  BusinessSubscriptionEventSource,
  BusinessSubscriptionEventType,
  BusinessSubscriptionPaymentSource,
  BusinessSubscriptionPaymentType,
  Prisma,
  SubscriptionBillingSource,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import type { RequestUser } from '@app/common/decorators/current-user.decorator';
import { PrismaService } from '@app/core/database/prisma.service';
import { IdempotencyService } from '@app/core/idempotency/idempotency.service';
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import type { StripeWebhookEvent } from '@app/modules/integrations/integrations/stripe/stripe.types';
import { BusinessAccessService } from '@app/modules/platform/business/services/business-access.service';
import { BusinessCapabilitySyncService } from '@app/modules/platform/business/services/business-capability-sync.service';
import { BusinessSubscriptionEventService } from '@app/modules/platform/business/services/business-subscription-event.service';
import { BusinessSubscriptionPaymentRepository } from '@app/modules/platform/business/repositories/business-subscription-payment.repository';
import { BusinessAddonSyncService } from '@app/modules/platform/business/services/business-addon-sync.service';
import {
  PLATFORM_SUBSCRIPTION_PURPOSE,
  type StripeCheckoutSessionObject,
  type StripeInvoiceObject,
  type StripeSubscriptionObject,
} from '../types/stripe-platform-billing.types';
import { StripePlatformMetadataService } from './stripe-platform-metadata.service';
import { StripePlatformPlanMappingService } from './stripe-platform-plan-mapping.service';
import { StripePlatformPaymentMethodService } from './stripe-platform-payment-method.service';
import { PlatformBillingDunningService } from './platform-billing-dunning.service';
import { StripeSubscriptionMirrorService } from './stripe-subscription-mirror.service';

const WEBHOOK_ACTOR: RequestUser = {
  id: SYSTEM_AUDIT_ACTOR_SENTINEL,
  email: 'stripe-webhook@system',
  context: 'platform',
};

@Injectable()
export class StripePlatformWebhookHandlerService {
  private readonly logger = new Logger(
    StripePlatformWebhookHandlerService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: BusinessAccessService,
    private readonly capabilitySyncService: BusinessCapabilitySyncService,
    private readonly eventService: BusinessSubscriptionEventService,
    private readonly paymentRepository: BusinessSubscriptionPaymentRepository,
    private readonly metadataService: StripePlatformMetadataService,
    private readonly planMapping: StripePlatformPlanMappingService,
    private readonly idempotencyService: IdempotencyService,
    private readonly paymentMethodService: StripePlatformPaymentMethodService,
    private readonly dunningService: PlatformBillingDunningService,
    private readonly subscriptionMirror: StripeSubscriptionMirrorService,
    @Inject(forwardRef(() => BusinessAddonSyncService))
    private readonly addonSync: BusinessAddonSyncService,
  ) {}

  isPlatformSubscriptionMetadata(
    metadata: Record<string, string> | null | undefined,
  ): boolean {
    return metadata?.purpose === PLATFORM_SUBSCRIPTION_PURPOSE;
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
      case 'setup_intent.succeeded':
        return this.handleSetupIntentSucceeded(event);
      default:
        return false;
    }
  }

  private async handleSetupIntentSucceeded(
    event: StripeWebhookEvent,
  ): Promise<boolean> {
    const setupIntent = event.data.object as {
      id?: string;
      customer?: string | { id?: string } | null;
      payment_method?: string | { id?: string } | null;
      metadata?: Record<string, string>;
    };
    if (!this.isPlatformSubscriptionMetadata(setupIntent.metadata)) {
      return false;
    }
    await this.paymentMethodService.syncFromSetupIntent(setupIntent);
    return true;
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
    const billingCycle = session.metadata?.billingCycle as
      | BusinessSubscriptionBillingCycle
      | undefined;

    if (!businessId || !planTierId || !billingCycle) {
      this.logger.warn(
        `checkout.session.completed missing platform metadata (${event.id})`,
      );
      return true;
    }

    const subscriptionId = this.resolveId(session.subscription);
    const customerId =
      typeof session.customer === 'string' ? session.customer : null;

    await this.subscriptionMirror.applyCheckoutLink({
      businessId,
      planGroupId: planGroupId ?? null,
      planTierId,
      billingCycle,
      customerId,
      subscriptionId,
    });

    await this.capabilitySyncService.syncFromPlanTier(businessId, planTierId);
    await this.addonSync.syncIncludedFromTier(businessId, planTierId);
    return true;
  }

  private async handleSubscriptionUpdated(
    event: StripeWebhookEvent,
  ): Promise<boolean> {
    const subscription = event.data.object as StripeSubscriptionObject;
    if (!this.isPlatformSubscriptionMetadata(subscription.metadata)) {
      return false;
    }

    const businessId = subscription.metadata?.businessId;
    if (!businessId) return true;

    const processed = await this.claimIdempotency(
      'stripe-platform-subscription',
      subscription.id ?? event.id,
    );
    if (!processed) return true;

    const before = await this.eventService.captureState(businessId);

    await this.subscriptionMirror.applyFromStripeSubscription(subscription, {
      syncCapabilities: true,
    });

    const after = await this.eventService.captureState(businessId);
    const sub = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    await this.eventService.createEvent(this.prisma, {
      businessId,
      subscriptionId: sub?.id,
      eventType: BusinessSubscriptionEventType.STATUS_CHANGED,
      actionKey: 'STRIPE_WEBHOOK',
      correlationId: randomUUID(),
      source: BusinessSubscriptionEventSource.WEBHOOK,
      fromState: before,
      toState: after,
      metadata: { stripeEventId: event.id, stripeEventType: event.type },
    });

    return true;
  }

  private async handleSubscriptionDeleted(
    event: StripeWebhookEvent,
  ): Promise<boolean> {
    const subscription = event.data.object as StripeSubscriptionObject;
    if (!this.isPlatformSubscriptionMetadata(subscription.metadata)) {
      return false;
    }

    const businessId =
      subscription.metadata?.businessId ??
      (
        await this.subscriptionMirror.findByStripeSubscriptionId(
          subscription.id ?? '',
        )
      )?.businessId;
    if (!businessId) return true;

    const processed = await this.claimIdempotency(
      'stripe-platform-subscription-deleted',
      `${subscription.id ?? event.id}:deleted`,
    );
    if (!processed) return true;

    const before = await this.eventService.captureState(businessId);

    // Sole STRIPE writer: mirror owns status/IDs/cancel flag + addon item clear.
    await this.subscriptionMirror.applyFromStripeSubscription(
      {
        ...subscription,
        status: 'canceled',
        cancel_at_period_end: false,
        items: { data: [] },
      },
      { syncCapabilities: false },
    );

    const after = await this.eventService.captureState(businessId);
    const sub = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    await this.eventService.createEvent(this.prisma, {
      businessId,
      subscriptionId: sub?.id,
      eventType: BusinessSubscriptionEventType.CANCELED,
      actionKey: 'STRIPE_WEBHOOK',
      correlationId: randomUUID(),
      source: BusinessSubscriptionEventSource.WEBHOOK,
      fromState: before,
      toState: after,
      metadata: { stripeEventId: event.id },
    });

    return true;
  }

  private async handleInvoicePaid(event: StripeWebhookEvent): Promise<boolean> {
    const invoice = event.data.object as StripeInvoiceObject;
    const subscriptionId = this.resolveId(invoice.subscription);
    if (!subscriptionId) return false;

    const local = await this.findSubscriptionByStripeId(subscriptionId);
    if (!local) return false;

    const processed = await this.claimIdempotency(
      'stripe-platform-invoice',
      invoice.id ?? event.id,
    );
    if (!processed) return true;

    const amountCents = invoice.amount_paid ?? 0;
    if (amountCents <= 0) return true;

    const existingPayment =
      await this.prisma.businessSubscriptionPayment.findFirst({
        where: {
          businessId: local.businessId,
          externalProvider: 'stripe',
          externalPaymentId: invoice.id ?? undefined,
        },
      });
    if (existingPayment) return true;

    const amount = new Prisma.Decimal(amountCents).div(100);
    const billingCycle =
      local.billingCycle ?? BusinessSubscriptionBillingCycle.MONTHLY;

    await this.paymentRepository.create({
      businessId: local.businessId,
      subscriptionId: local.id,
      amount,
      currency: (invoice.currency ?? local.currency ?? 'usd').toUpperCase(),
      paymentMethod: SubscriptionPaymentMethod.STRIPE,
      paymentStatus: SubscriptionPaymentStatus.PAID,
      paymentType: BusinessSubscriptionPaymentType.SUBSCRIPTION,
      billingCycle,
      source: BusinessSubscriptionPaymentSource.WEBHOOK,
      periodStart: invoice.period_start
        ? new Date(invoice.period_start * 1000)
        : undefined,
      periodEnd: invoice.period_end
        ? new Date(invoice.period_end * 1000)
        : undefined,
      paidAt: new Date(),
      externalProvider: 'stripe',
      externalPaymentId: invoice.id ?? event.id,
      metadata: { stripeEventId: event.id },
    });

    // Status/amount/periods come from the subscription snapshot when available;
    // invoice handler only logs payment + soft-confirm ACTIVE if no retrieve.
    await this.prisma.businessSubscription.update({
      where: { businessId: local.businessId },
      data: {
        metadata: this.metadataService.mergeSubscriptionStripeMetadata(
          local.metadata,
          { latestInvoiceId: invoice.id ?? undefined, status: 'active' },
        ),
      },
    });

    await this.accessService.updateAccessInternal(
      this.prisma,
      local.businessId,
      {
        businessStatus: BusinessStatus.ACTIVE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        paymentMethod: SubscriptionPaymentMethod.STRIPE,
        paymentStatus: SubscriptionPaymentStatus.PAID,
        amount: Number(amount),
        currency: (invoice.currency ?? local.currency ?? 'usd').toUpperCase(),
      },
      WEBHOOK_ACTOR,
      { skipAudit: true },
    );

    return true;
  }

  private async handleInvoicePaymentFailed(
    event: StripeWebhookEvent,
  ): Promise<boolean> {
    const invoice = event.data.object as StripeInvoiceObject;
    const subscriptionId = this.resolveId(invoice.subscription);
    if (!subscriptionId) return false;

    const local = await this.findSubscriptionByStripeId(subscriptionId);
    if (!local) return false;

    const processed = await this.claimIdempotency(
      'stripe-platform-invoice-failed',
      `${invoice.id ?? event.id}:failed`,
    );
    if (!processed) return true;

    // PAST_DUE is a webhook-authored mirror write (invoice.payment_failed).
    await this.accessService.updateAccessInternal(
      this.prisma,
      local.businessId,
      {
        businessStatus: BusinessStatus.ACTIVE,
        subscriptionStatus: SubscriptionStatus.PAST_DUE,
        paymentMethod: SubscriptionPaymentMethod.STRIPE,
        paymentStatus: SubscriptionPaymentStatus.FAILED,
      },
      WEBHOOK_ACTOR,
      { skipAudit: true },
    );

    await this.prisma.businessSubscription.update({
      where: { businessId: local.businessId },
      data: {
        metadata: this.metadataService.mergeSubscriptionStripeMetadata(
          local.metadata,
          { status: 'past_due', latestInvoiceId: invoice.id ?? undefined },
        ),
      },
    });

    await this.dunningService.onPaymentFailed(
      local.businessId,
      invoice.id ?? null,
    );

    return true;
  }

  private async findSubscriptionByStripeId(stripeSubscriptionId: string) {
    return this.subscriptionMirror.findByStripeSubscriptionId(
      stripeSubscriptionId,
    );
  }

  private async resolveTierFromPrice(
    planGroupId: string,
    priceId: string,
  ): Promise<{
    planTierId: string;
    billingCycle: BusinessSubscriptionBillingCycle;
  } | null> {
    const tiers = await this.prisma.planTier.findMany({
      where: { planGroupId, deletedAt: null },
    });

    for (const tier of tiers) {
      const stripeMeta = this.planMapping.parseTierStripeMetadata(
        tier.metadata,
      );
      if (stripeMeta?.monthlyPriceId === priceId) {
        return {
          planTierId: tier.id,
          billingCycle: BusinessSubscriptionBillingCycle.MONTHLY,
        };
      }
      if (stripeMeta?.yearlyPriceId === priceId) {
        return {
          planTierId: tier.id,
          billingCycle: BusinessSubscriptionBillingCycle.YEARLY,
        };
      }
    }
    return null;
  }

  private resolveId(
    value: string | { id?: string } | null | undefined,
  ): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return value.id ?? null;
  }

  private async claimIdempotency(scope: string, key: string): Promise<boolean> {
    return this.idempotencyService.claim(scope, key, 7 * 24 * 60 * 60);
  }
}
