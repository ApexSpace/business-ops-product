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
import { SYSTEM_AUDIT_ACTOR_SENTINEL } from '@app/modules/platform/audit/constants/audit.constants';
import { PrismaService } from '@app/core/database/prisma.service';
import { BusinessAccessService } from '@app/modules/platform/business/services/business-access.service';
import { BusinessCapabilitySyncService } from '@app/modules/platform/business/services/business-capability-sync.service';
import { BusinessSubscriptionEventService } from '@app/modules/platform/business/services/business-subscription-event.service';
import { BusinessSubscriptionPaymentRepository } from '@app/modules/platform/business/repositories/business-subscription-payment.repository';
import type { StripeWebhookEvent } from '@app/modules/integrations/integrations/stripe/stripe.types';
import {
  PLATFORM_SUBSCRIPTION_PURPOSE,
  type StripeCheckoutSessionObject,
  type StripeInvoiceObject,
  type StripeSubscriptionObject,
} from '../types/stripe-platform-billing.types';
import { StripePlatformMetadataService } from './stripe-platform-metadata.service';
import { StripePlatformPlanMappingService } from './stripe-platform-plan-mapping.service';
import { StripePlatformApiService } from './stripe-platform-api.service';
import { resolveBusinessStatusForBillingChange } from '@app/modules/platform/business/utils/business-workspace-access.util';
import { resolveStripeSubscriptionPeriod } from '../utils/stripe-subscription-period.util';

export type StripeWebhookSyncContext = {
  actor: RequestUser;
  stripeEventId: string;
  stripeEventType: string;
};

/**
 * WEBHOOK-ONLY trusted Stripe sync. These methods bypass manual billing-source
 * guards and must not be used from admin/manual subscription actions.
 */
@Injectable()
export class StripePlatformSyncService {
  private readonly logger = new Logger(StripePlatformSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: BusinessAccessService,
    private readonly capabilitySyncService: BusinessCapabilitySyncService,
    private readonly eventService: BusinessSubscriptionEventService,
    private readonly paymentRepository: BusinessSubscriptionPaymentRepository,
    private readonly metadataService: StripePlatformMetadataService,
    private readonly planMapping: StripePlatformPlanMappingService,
    private readonly stripeApi: StripePlatformApiService,
  ) {}

  isPlatformSubscriptionMetadata(
    metadata: Record<string, string> | null | undefined,
  ): boolean {
    return metadata?.purpose === PLATFORM_SUBSCRIPTION_PURPOSE;
  }

  async syncSubscriptionFromStripeWebhook(
    event: StripeWebhookEvent,
  ): Promise<boolean> {
    switch (event.type) {
      case 'checkout.session.completed':
        return this.applyStripeCheckoutCompleted(
          event.data.object as StripeCheckoutSessionObject,
        );
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        return this.applyStripeSubscriptionCreatedOrUpdated(
          event.data.object as StripeSubscriptionObject,
          {
            stripeEventId: event.id,
            stripeEventType: event.type,
          },
        );
      case 'customer.subscription.deleted':
        return this.applyStripeSubscriptionDeleted(
          event.data.object as StripeSubscriptionObject,
          { stripeEventId: event.id },
        );
      case 'invoice.paid':
        return this.recordStripeInvoicePaid(
          event.data.object as StripeInvoiceObject,
          { stripeEventId: event.id },
        );
      case 'invoice.payment_failed':
        return this.recordStripeInvoicePaymentFailed(
          event.data.object as StripeInvoiceObject,
          { stripeEventId: event.id },
        );
      default:
        return false;
    }
  }

  /** WEBHOOK-ONLY */
  async applyStripeCheckoutCompleted(
    session: StripeCheckoutSessionObject,
  ): Promise<boolean> {
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
      pendingCheckoutSessionId: null,
      pendingPlanGroupId: null,
      pendingPlanTierId: null,
      pendingBillingCycle: null,
      checkoutStartedAt: null,
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
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: SubscriptionPaymentMethod.STRIPE,
        paymentStatus: SubscriptionPaymentStatus.PAID,
        metadata: this.metadataService.mergeSubscriptionStripeMetadata(
          existing?.metadata,
          stripePatch,
        ),
      },
    });

    await this.capabilitySyncService.syncFromPlanTier(businessId, planTierId);

    if (subscriptionId) {
      await this.syncSubscriptionPeriodsFromStripe(
        subscriptionId,
        businessId,
        `checkout:${session.id ?? 'unknown'}`,
        'checkout.session.completed',
      );
    }

    return true;
  }

  private async syncSubscriptionPeriodsFromStripe(
    stripeSubscriptionId: string,
    businessId: string,
    stripeEventId: string,
    stripeEventType: string,
  ): Promise<void> {
    try {
      const stripe = this.stripeApi.getClient();
      const subscription = (await stripe.subscriptions.retrieve(
        stripeSubscriptionId,
        { expand: ['items.data.price.product'] },
      )) as StripeSubscriptionObject;

      await this.applyStripeSubscriptionCreatedOrUpdated(
        subscription,
        { stripeEventId, stripeEventType },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Stripe checkout period sync failed for business ${businessId}: ${message}`,
      );
    }
  }

  /** WEBHOOK-ONLY */
  async applyStripeSubscriptionCreatedOrUpdated(
    subscription: StripeSubscriptionObject,
    context: { stripeEventId: string; stripeEventType: string },
    actor?: RequestUser,
  ): Promise<boolean> {
    if (!this.isPlatformSubscriptionMetadata(subscription.metadata)) {
      return false;
    }

    const businessId = subscription.metadata?.businessId;
    if (!businessId) return true;

    const item = subscription.items?.data?.[0];
    const priceId = item?.price?.id;
    const productId = this.resolveId(item?.price?.product);
    const customerId = this.resolveId(subscription.customer);

    const local = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    let planTierId = subscription.metadata?.planTierId ?? local?.planTierId;
    const planGroupId =
      subscription.metadata?.planGroupId ?? local?.planGroupId;
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
    const { periodStart, periodEnd } =
      resolveStripeSubscriptionPeriod(subscription);

    const webhookActor = actor ?? this.defaultWebhookActor();
    const before = await this.eventService.captureState(businessId);
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      select: { status: true },
    });
    const businessStatus = resolveBusinessStatusForBillingChange(
      business?.status ?? BusinessStatus.ACTIVE,
    );

    await this.accessService.updateAccessFromStripeSync(
      this.prisma,
      businessId,
      {
        businessStatus,
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
      webhookActor,
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
      fromState: before,
      toState: after,
      metadata: {
        stripeEventId: context.stripeEventId,
        stripeEventType: context.stripeEventType,
      },
    });

    return true;
  }

  /** WEBHOOK-ONLY */
  async applyStripeSubscriptionDeleted(
    subscription: StripeSubscriptionObject,
    context: { stripeEventId: string },
    actor?: RequestUser,
  ): Promise<boolean> {
    if (!this.isPlatformSubscriptionMetadata(subscription.metadata)) {
      return false;
    }

    const businessId = subscription.metadata?.businessId;
    if (!businessId) return true;

    const webhookActor = actor ?? this.defaultWebhookActor();
    const before = await this.eventService.captureState(businessId);
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      select: { status: true },
    });
    const businessStatus = resolveBusinessStatusForBillingChange(
      business?.status ?? BusinessStatus.ACTIVE,
    );

    await this.accessService.updateAccessFromStripeSync(
      this.prisma,
      businessId,
      {
        businessStatus,
        subscriptionStatus: SubscriptionStatus.CANCELED,
      },
      webhookActor,
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
      fromState: before,
      toState: after,
      metadata: { stripeEventId: context.stripeEventId },
    });

    return true;
  }

  /** WEBHOOK-ONLY */
  async recordStripeInvoicePaid(
    invoice: StripeInvoiceObject,
    context: { stripeEventId: string },
    actor?: RequestUser,
  ): Promise<boolean> {
    const subscriptionId = this.resolveId(invoice.subscription);
    if (!subscriptionId) return false;

    const local = await this.findSubscriptionByStripeId(subscriptionId);
    if (!local) return false;

    const amountCents = invoice.amount_paid ?? 0;
    if (amountCents <= 0) return true;

    const invoiceId = invoice.id ?? context.stripeEventId;
    const existingPayment =
      await this.prisma.businessSubscriptionPayment.findFirst({
        where: {
          businessId: local.businessId,
          externalProvider: 'stripe',
          externalPaymentId: invoiceId,
        },
      });
    if (existingPayment) return true;

    const amount = new Prisma.Decimal(amountCents).div(100);
    const billingCycle =
      local.billingCycle ?? BusinessSubscriptionBillingCycle.MONTHLY;
    const webhookActor = actor ?? this.defaultWebhookActor();
    const periodStart = invoice.period_start
      ? new Date(invoice.period_start * 1000)
      : undefined;
    const periodEnd = invoice.period_end
      ? new Date(invoice.period_end * 1000)
      : undefined;

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
      externalPaymentId: invoiceId,
      metadata: { stripeEventId: context.stripeEventId },
    });

    await this.accessService.updateAccessFromStripeSync(
      this.prisma,
      local.businessId,
      {
        businessStatus: BusinessStatus.ACTIVE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        paymentMethod: SubscriptionPaymentMethod.STRIPE,
        paymentStatus: SubscriptionPaymentStatus.PAID,
        amount: Number(amount),
        currency: (invoice.currency ?? local.currency ?? 'usd').toUpperCase(),
        ...(periodStart
          ? { currentPeriodStart: periodStart.toISOString().slice(0, 10) }
          : {}),
        ...(periodEnd
          ? { currentPeriodEnd: periodEnd.toISOString().slice(0, 10) }
          : {}),
      },
      webhookActor,
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

  /** WEBHOOK-ONLY */
  async recordStripeInvoicePaymentFailed(
    invoice: StripeInvoiceObject,
    context: { stripeEventId: string },
    actor?: RequestUser,
  ): Promise<boolean> {
    const subscriptionId = this.resolveId(invoice.subscription);
    if (!subscriptionId) return false;

    const local = await this.findSubscriptionByStripeId(subscriptionId);
    if (!local) return false;

    const webhookActor = actor ?? this.defaultWebhookActor();
    const business = await this.prisma.business.findFirst({
      where: { id: local.businessId, deletedAt: null },
      select: { status: true },
    });
    const businessStatus = resolveBusinessStatusForBillingChange(
      business?.status ?? BusinessStatus.ACTIVE,
    );

    await this.accessService.updateAccessFromStripeSync(
      this.prisma,
      local.businessId,
      {
        businessStatus,
        subscriptionStatus: SubscriptionStatus.PENDING_PAYMENT,
        paymentMethod: SubscriptionPaymentMethod.STRIPE,
        paymentStatus: SubscriptionPaymentStatus.FAILED,
      },
      webhookActor,
      { skipAudit: true },
    );

    return true;
  }

  async findSubscriptionByStripeId(stripeSubscriptionId: string) {
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

  private defaultWebhookActor(): RequestUser {
    return {
      id: SYSTEM_AUDIT_ACTOR_SENTINEL,
      email: 'stripe-webhook@system',
      context: 'platform',
    };
  }
}
