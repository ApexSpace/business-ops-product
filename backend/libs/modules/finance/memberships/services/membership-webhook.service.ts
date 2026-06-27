import { Injectable, Logger } from '@nestjs/common';
import {
  ClientMembershipStatus,
  MembershipBillingEventType,
  MembershipPlanType,
  Prisma,
} from '@prisma/client';
import type { StripeWebhookEvent } from '@app/modules/integrations/integrations/stripe/stripe.types';
import { PrismaService } from '@app/core/database/prisma.service';
import { ClientMembershipRepository } from '../repositories/client-membership.repository';
import { MembershipPlanRepository } from '../repositories/membership-plan.repository';
import { ClientMembershipsService } from './client-memberships.service';
import { MembershipOnlineCheckoutService } from './membership-online-checkout.service';
import { STRIPE_PAYMENT_PURPOSE } from '@app/modules/finance/payments/constants/stripe-payment-purpose.constants';

@Injectable()
export class MembershipWebhookService {
  private readonly logger = new Logger(MembershipWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientMembershipRepository: ClientMembershipRepository,
    private readonly planRepository: MembershipPlanRepository,
    private readonly clientMembershipsService: ClientMembershipsService,
    private readonly onlineCheckoutService: MembershipOnlineCheckoutService,
  ) {}

  async handleCheckoutSessionCompleted(
    event: StripeWebhookEvent,
  ): Promise<boolean> {
    const session = event.data.object as {
      metadata?: Record<string, string>;
      subscription?: string | { id?: string } | null;
    };
    const metadata = session.metadata ?? {};
    if (
      metadata.type !== 'membership' &&
      metadata.purpose !== STRIPE_PAYMENT_PURPOSE.MEMBERSHIP
    ) {
      return false;
    }

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

    return this.onlineCheckoutService.handleCheckoutSessionCompleted(
      metadata,
      subscriptionId,
    );
  }

  async handleInvoicePaymentSucceeded(
    event: StripeWebhookEvent,
  ): Promise<boolean> {
    const invoice = event.data.object as {
      id?: string;
      subscription?: string | { id?: string } | null;
      amount_paid?: number;
      period_start?: number;
      period_end?: number;
      payment_intent?: string | { id?: string } | null;
    };

    const subscriptionId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;
    if (!subscriptionId || !invoice.id) return false;

    if (await this.clientMembershipRepository.billingEventExists(invoice.id)) {
      return true;
    }

    const membership =
      await this.clientMembershipRepository.findByStripeSubscription(
        subscriptionId,
      );
    if (!membership) return false;

    const periodStart = invoice.period_start
      ? new Date(invoice.period_start * 1000)
      : new Date();
    const periodEnd = invoice.period_end
      ? new Date(invoice.period_end * 1000)
      : null;

    const isRenewal =
      membership.currentPeriodStart != null &&
      membership.status === ClientMembershipStatus.ACTIVE;

    await this.prisma.clientMembership.update({
      where: { id: membership.id },
      data: {
        status: ClientMembershipStatus.ACTIVE,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        nextBillingDate: periodEnd,
      },
    });

    const plan = await this.planRepository.findById(
      membership.businessId,
      membership.planId,
    );
    if (!plan) return true;

    if (isRenewal) {
      await this.closePreviousUsageRecords(membership.id, periodStart);
      await this.clientMembershipsService.createUsageRecordsForPeriod(
        membership.id,
        plan,
        periodStart,
        periodEnd,
      );
    }

    if (
      plan.planType === MembershipPlanType.ACCOUNT_CREDIT &&
      plan.creditAmount
    ) {
      await this.clientMembershipsService.creditAccountBalance(
        membership.businessId,
        membership.contactId,
        plan.creditAmount,
        membership.id,
      );
    }

    const paymentIntentId =
      typeof invoice.payment_intent === 'string'
        ? invoice.payment_intent
        : invoice.payment_intent?.id;

    await this.prisma.membershipBillingEvent.create({
      data: {
        clientMembershipId: membership.id,
        eventType: isRenewal
          ? MembershipBillingEventType.SUBSCRIPTION_RENEWED
          : MembershipBillingEventType.PAYMENT_SUCCEEDED,
        amount: invoice.amount_paid
          ? new Prisma.Decimal((invoice.amount_paid / 100).toFixed(2))
          : null,
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: paymentIntentId ?? null,
      },
    });

    return true;
  }

  async handleInvoicePaymentFailed(event: StripeWebhookEvent): Promise<boolean> {
    const invoice = event.data.object as {
      id?: string;
      subscription?: string | { id?: string } | null;
    };

    const subscriptionId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;
    if (!subscriptionId) return false;

    const membership =
      await this.clientMembershipRepository.findByStripeSubscription(
        subscriptionId,
      );
    if (!membership) return false;

    await this.prisma.clientMembership.update({
      where: { id: membership.id },
      data: { status: ClientMembershipStatus.PAST_DUE },
    });

    await this.prisma.membershipBillingEvent.create({
      data: {
        clientMembershipId: membership.id,
        eventType: MembershipBillingEventType.PAYMENT_FAILED,
        stripeInvoiceId: invoice.id,
      },
    });

    return true;
  }

  async handleSubscriptionUpdated(event: StripeWebhookEvent): Promise<boolean> {
    const subscription = event.data.object as {
      id?: string;
      status?: string;
      metadata?: Record<string, string>;
      cancel_at_period_end?: boolean;
      current_period_end?: number;
    };

    if (
      subscription.metadata?.type !== 'membership' &&
      subscription.metadata?.purpose !== STRIPE_PAYMENT_PURPOSE.MEMBERSHIP
    ) {
      const membership = subscription.id
        ? await this.clientMembershipRepository.findByStripeSubscription(
            subscription.id,
          )
        : null;
      if (!membership) return false;
    }

    if (!subscription.id) return false;

    const membership =
      await this.clientMembershipRepository.findByStripeSubscription(
        subscription.id,
      );
    if (!membership) return false;

    const status = this.mapStripeStatus(subscription.status);
    await this.prisma.clientMembership.update({
      where: { id: membership.id },
      data: {
        status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        nextBillingDate: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : undefined,
      },
    });

    return true;
  }

  async handleSubscriptionDeleted(event: StripeWebhookEvent): Promise<boolean> {
    const subscription = event.data.object as { id?: string };
    if (!subscription.id) return false;

    const membership =
      await this.clientMembershipRepository.findByStripeSubscription(
        subscription.id,
      );
    if (!membership) return false;

    await this.prisma.clientMembership.update({
      where: { id: membership.id },
      data: {
        status: ClientMembershipStatus.CANCELED,
        canceledAt: new Date(),
      },
    });

    await this.prisma.membershipBillingEvent.create({
      data: {
        clientMembershipId: membership.id,
        eventType: MembershipBillingEventType.SUBSCRIPTION_CANCELED,
      },
    });

    return true;
  }

  private mapStripeStatus(
    stripeStatus?: string,
  ): ClientMembershipStatus {
    switch (stripeStatus) {
      case 'active':
        return ClientMembershipStatus.ACTIVE;
      case 'past_due':
        return ClientMembershipStatus.PAST_DUE;
      case 'unpaid':
        return ClientMembershipStatus.UNPAID;
      case 'paused':
        return ClientMembershipStatus.PAUSED;
      case 'canceled':
        return ClientMembershipStatus.CANCELED;
      case 'trialing':
        return ClientMembershipStatus.SCHEDULED;
      default:
        return ClientMembershipStatus.ACTIVE;
    }
  }

  private async closePreviousUsageRecords(
    clientMembershipId: string,
    periodStart: Date,
  ) {
    await this.prisma.membershipUsageRecord.updateMany({
      where: {
        clientMembershipId,
        periodEnd: null,
        periodStart: { lt: periodStart },
      },
      data: { periodEnd: periodStart },
    });
  }
}
