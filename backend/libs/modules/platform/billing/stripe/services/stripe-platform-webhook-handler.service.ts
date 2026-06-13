import { Injectable, Logger } from '@nestjs/common';
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
import {
  PLATFORM_SUBSCRIPTION_PURPOSE,
  type StripeCheckoutSessionObject,
  type StripeInvoiceObject,
  type StripeSubscriptionObject,
} from '../types/stripe-platform-billing.types';
import { StripePlatformMetadataService } from './stripe-platform-metadata.service';
import { StripePlatformPlanMappingService } from './stripe-platform-plan-mapping.service';

const WEBHOOK_ACTOR: RequestUser = {
  id: SYSTEM_AUDIT_ACTOR_SENTINEL,
  email: 'stripe-webhook@system',
  context: 'platform',
};

@Injectable()
export class StripePlatformWebhookHandlerService {
  private readonly logger = new Logger(StripePlatformWebhookHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: BusinessAccessService,
    private readonly capabilitySyncService: BusinessCapabilitySyncService,
    private readonly eventService: BusinessSubscriptionEventService,
    private readonly paymentRepository: BusinessSubscriptionPaymentRepository,
    private readonly metadataService: StripePlatformMetadataService,
    private readonly planMapping: StripePlatformPlanMappingService,
    private readonly idempotencyService: IdempotencyService,
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
    const billingCycle = session.metadata?.billingCycle as
      | BusinessSubscriptionBillingCycle
      | undefined;

    if (!businessId || !planGroupId || !planTierId || !billingCycle) {
      this.logger.warn(
        `checkout.session.completed missing platform metadata (${event.id})`,
      );
      return true;
    }

    const subscriptionId = this.resolveId(session.subscription);
    const customerId =
      typeof session.customer === 'string' ? session.customer : null;

    const existing = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    const stripePatch = {
      customerId: customerId ?? undefined,
      subscriptionId: subscriptionId ?? undefined,
      status: 'active',
    };

    await this.prisma.businessSubscription.upsert({
      where: { businessId },
      create: {
        businessId,
        planGroupId,
        planTierId,
        billingCycle,
        billingSource: SubscriptionBillingSource.STRIPE,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: SubscriptionPaymentMethod.STRIPE,
        paymentStatus: SubscriptionPaymentStatus.PAID,
        metadata: this.metadataService.mergeSubscriptionStripeMetadata(
          null,
          stripePatch,
        ),
      },
      update: {
        planGroupId,
        planTierId,
        billingCycle,
        billingSource: SubscriptionBillingSource.STRIPE,
        paymentMethod: SubscriptionPaymentMethod.STRIPE,
        metadata: this.metadataService.mergeSubscriptionStripeMetadata(
          existing?.metadata,
          stripePatch,
        ),
      },
    });

    await this.capabilitySyncService.syncFromPlanTier(businessId, planTierId);
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

    const item = subscription.items?.data?.[0];
    const priceId = item?.price?.id;
    const productId = this.resolveId(item?.price?.product);
    const customerId = this.resolveId(subscription.customer);

    const local = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    let planTierId = subscription.metadata?.planTierId ?? local?.planTierId;
    let planGroupId = subscription.metadata?.planGroupId ?? local?.planGroupId;
    let billingCycle =
      (subscription.metadata?.billingCycle as
        | BusinessSubscriptionBillingCycle
        | undefined) ?? local?.billingCycle;

    if (priceId && planGroupId) {
      const resolved = await this.resolveTierFromPrice(planGroupId, priceId);
      if (resolved) {
        planTierId = resolved.planTierId;
        billingCycle = resolved.billingCycle;
      }
    }

    const status = this.mapStripeSubscriptionStatus(subscription.status);
    const periodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000)
      : undefined;
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : undefined;

    const before = await this.eventService.captureState(businessId);

    await this.accessService.updateAccessInternal(
      this.prisma,
      businessId,
      {
        businessStatus:
          status === SubscriptionStatus.CANCELED ||
          status === SubscriptionStatus.EXPIRED
            ? BusinessStatus.NOT_ACTIVE
            : BusinessStatus.ACTIVE,
        subscriptionStatus: status,
        paymentMethod: SubscriptionPaymentMethod.STRIPE,
        paymentStatus:
          status === SubscriptionStatus.PENDING_PAYMENT
            ? SubscriptionPaymentStatus.PENDING
            : status === SubscriptionStatus.ACTIVE ||
                status === SubscriptionStatus.TRIALING
              ? SubscriptionPaymentStatus.PAID
              : undefined,
        planGroupId: planGroupId ?? undefined,
        planTierId: planTierId ?? undefined,
        billingCycle: billingCycle ?? undefined,
        currentPeriodStart: periodStart?.toISOString().slice(0, 10),
        currentPeriodEnd: periodEnd?.toISOString().slice(0, 10),
        syncCapabilitiesFromTier: true,
      },
      WEBHOOK_ACTOR,
      { skipAudit: true },
    );

    await this.prisma.businessSubscription.update({
      where: { businessId },
      data: {
        billingSource: SubscriptionBillingSource.STRIPE,
        metadata: this.metadataService.mergeSubscriptionStripeMetadata(
          local?.metadata,
          {
            customerId: customerId ?? undefined,
            subscriptionId: subscription.id,
            subscriptionItemId: item?.id,
            priceId,
            productId: productId ?? undefined,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            cancelAt: subscription.cancel_at
              ? new Date(subscription.cancel_at * 1000).toISOString()
              : null,
            canceledAt: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
            latestInvoiceId: this.resolveId(subscription.latest_invoice),
          },
        ),
        ...(subscription.canceled_at
          ? { canceledAt: new Date(subscription.canceled_at * 1000) }
          : {}),
      },
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
      fromState: before as unknown as Prisma.InputJsonValue,
      toState: after as unknown as Prisma.InputJsonValue,
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

    const businessId = subscription.metadata?.businessId;
    if (!businessId) return true;

    const processed = await this.claimIdempotency(
      'stripe-platform-subscription-deleted',
      `${subscription.id ?? event.id}:deleted`,
    );
    if (!processed) return true;

    const before = await this.eventService.captureState(businessId);

    await this.accessService.updateAccessInternal(
      this.prisma,
      businessId,
      {
        businessStatus: BusinessStatus.NOT_ACTIVE,
        subscriptionStatus: SubscriptionStatus.CANCELED,
      },
      WEBHOOK_ACTOR,
      { skipAudit: true },
    );

    const local = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    await this.prisma.businessSubscription.update({
      where: { businessId },
      data: {
        canceledAt: new Date(),
        metadata: this.metadataService.mergeSubscriptionStripeMetadata(
          local?.metadata,
          {
            status: 'canceled',
            canceledAt: new Date().toISOString(),
            cancelAtPeriodEnd: false,
          },
        ),
      },
    });

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
      fromState: before as unknown as Prisma.InputJsonValue,
      toState: after as unknown as Prisma.InputJsonValue,
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
      metadata: { stripeEventId: event.id } as Prisma.InputJsonValue,
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

    await this.prisma.businessSubscription.update({
      where: { businessId: local.businessId },
      data: {
        metadata: this.metadataService.mergeSubscriptionStripeMetadata(
          local.metadata,
          { latestInvoiceId: invoice.id ?? undefined, status: 'active' },
        ),
      },
    });

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

    await this.accessService.updateAccessInternal(
      this.prisma,
      local.businessId,
      {
        businessStatus: BusinessStatus.NOT_ACTIVE,
        subscriptionStatus: SubscriptionStatus.PENDING_PAYMENT,
        paymentMethod: SubscriptionPaymentMethod.STRIPE,
        paymentStatus: SubscriptionPaymentStatus.FAILED,
      },
      WEBHOOK_ACTOR,
      { skipAudit: true },
    );

    return true;
  }

  private async findSubscriptionByStripeId(stripeSubscriptionId: string) {
    const rows = await this.prisma.businessSubscription.findMany({
      where: { billingSource: SubscriptionBillingSource.STRIPE },
      take: 200,
      orderBy: { updatedAt: 'desc' },
    });

    for (const row of rows) {
      const meta = this.metadataService.parseSubscriptionStripeMetadata(
        row.metadata,
      );
      if (meta?.subscriptionId === stripeSubscriptionId) {
        return row;
      }
    }
    return null;
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
      const stripeMeta = this.planMapping.parseTierStripeMetadata(tier.metadata);
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

  private mapStripeSubscriptionStatus(
    status: string | undefined,
  ): SubscriptionStatus {
    switch (status) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'trialing':
        return SubscriptionStatus.TRIALING;
      case 'past_due':
      case 'unpaid':
        return SubscriptionStatus.PENDING_PAYMENT;
      case 'canceled':
        return SubscriptionStatus.CANCELED;
      case 'incomplete':
      case 'incomplete_expired':
        return SubscriptionStatus.PENDING_PAYMENT;
      default:
        return SubscriptionStatus.ACTIVE;
    }
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
