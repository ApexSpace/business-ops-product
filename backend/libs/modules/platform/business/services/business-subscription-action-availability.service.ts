import { Injectable } from '@nestjs/common';
import {
  BusinessStatus,
  SubscriptionBillingSource,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import { BusinessRepository } from '../repositories/business.repository';
import { BusinessAccessResolverService } from './business-access-resolver.service';
import {
  SubscriptionActionDefinition,
  SubscriptionActionKey,
} from '../types/subscription-action.types';
import { BusinessAccessReasonCode } from '../types/business-access-resolution.types';
import { SubscriptionStateSnapshot } from '../types/subscription-state-snapshot.types';
import {
  isActionVisibleForBillingSource,
  STRIPE_MANAGED_MESSAGE,
} from '../utils/billing-source-action.util';

@Injectable()
export class BusinessSubscriptionActionAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessRepository: BusinessRepository,
    private readonly accessResolver: BusinessAccessResolverService,
  ) {}

  async resolveAvailableActions(businessId: string): Promise<{
    availableActions: SubscriptionActionDefinition[];
    recommendedAction: SubscriptionActionDefinition | null;
    state: SubscriptionStateSnapshot;
  }> {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      return {
        availableActions: [],
        recommendedAction: null,
        state: { businessStatus: BusinessStatus.NOT_ACTIVE },
      };
    }

    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });
    const resolution = await this.accessResolver.resolveForBusiness(businessId);

    const state: SubscriptionStateSnapshot = {
      businessStatus: business.status,
      billingSource: subscription?.billingSource ?? null,
      subscriptionStatus: subscription?.status ?? null,
      paymentMethod: subscription?.paymentMethod ?? null,
      paymentStatus: subscription?.paymentStatus ?? null,
      planTierId: subscription?.planTierId ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
      snapshotId: business.snapshotId,
    };

    const actions = this.buildActionDefinitions(
      business.status,
      subscription,
      resolution,
    );

    const recommendedAction = this.getRecommendedAction(actions, state);

    return { availableActions: actions, recommendedAction, state };
  }

  resolveAction(
    actionKey: SubscriptionActionKey,
    state: SubscriptionStateSnapshot,
  ): SubscriptionActionDefinition {
    const actions = this.buildActionDefinitions(
      state.businessStatus,
      state.subscriptionStatus
        ? {
            billingSource: state.billingSource ?? null,
            status: state.subscriptionStatus,
            paymentStatus:
              state.paymentStatus ?? SubscriptionPaymentStatus.NOT_REQUIRED,
            planTierId: state.planTierId ?? null,
          }
        : null,
      {
        canAccessWorkspace: state.accessResolution?.canAccessWorkspace ?? false,
        reasonCode:
          (state.accessResolution?.reasonCode as BusinessAccessReasonCode) ??
          'BUSINESS_NOT_ACTIVE',
        reasonLabel: state.accessResolution?.reasonLabel ?? '',
        warnings: state.accessResolution?.warnings ?? [],
        needsAttention: [],
        effectiveCapabilities: [],
      },
    );

    return (
      actions.find((a) => a.key === actionKey) ?? {
        key: actionKey,
        label: actionKey,
        category: 'access',
        visible: false,
        enabled: false,
        disabledReason: 'Unknown action',
        severity: 'safe',
        requiresConfirmation: false,
        requiresInput: false,
      }
    );
  }

  getRecommendedAction(
    actions: SubscriptionActionDefinition[],
    state: SubscriptionStateSnapshot,
  ): SubscriptionActionDefinition | null {
    const enabled = actions.filter((a) => a.visible && a.enabled);
    const isStripe =
      state.billingSource === SubscriptionBillingSource.STRIPE;

    if (
      state.subscriptionStatus === SubscriptionStatus.PENDING_PAYMENT ||
      state.paymentStatus === SubscriptionPaymentStatus.PENDING
    ) {
      if (isStripe) {
        return (
          enabled.find((a) => a.key === 'RESYNC_FROM_STRIPE') ??
          enabled.find((a) => a.key === 'OPEN_STRIPE_PORTAL') ??
          enabled.find((a) => a.category === 'recommended') ??
          null
        );
      }
      return (
        enabled.find((a) => a.key === 'MARK_PAID') ??
        enabled.find((a) => a.category === 'recommended') ??
        null
      );
    }

    if (state.businessStatus === BusinessStatus.SUSPENDED) {
      return enabled.find((a) => a.key === 'REACTIVATE_BUSINESS') ?? null;
    }

    if (
      state.subscriptionStatus === SubscriptionStatus.CANCELED ||
      state.subscriptionStatus === SubscriptionStatus.EXPIRED
    ) {
      return enabled.find((a) => a.key === 'REACTIVATE_BUSINESS') ?? null;
    }

    if (state.subscriptionStatus === SubscriptionStatus.TRIALING) {
      const periodEnd = state.currentPeriodEnd
        ? new Date(state.currentPeriodEnd)
        : null;
      if (periodEnd && periodEnd < new Date()) {
        if (isStripe) {
          return (
            enabled.find((a) => a.key === 'OPEN_STRIPE_PORTAL') ??
            enabled.find((a) => a.key === 'CHANGE_PACKAGE') ??
            null
          );
        }
        if (state.billingSource === SubscriptionBillingSource.NOT_SELECTED) {
          return (
            enabled.find((a) => a.key === 'EXTEND_TRIAL') ??
            enabled.find((a) => a.key === 'CHANGE_PACKAGE') ??
            null
          );
        }
        return (
          enabled.find((a) => a.key === 'EXTEND_TRIAL') ??
          enabled.find((a) => a.key === 'MARK_PAID') ??
          null
        );
      }
    }

    return enabled.find((a) => a.category === 'recommended') ?? null;
  }

  private buildActionDefinitions(
    businessStatus: BusinessStatus,
    subscription: {
      billingSource?: SubscriptionBillingSource | null;
      status: SubscriptionStatus;
      paymentStatus: SubscriptionPaymentStatus;
      planTierId: string | null;
    } | null,
    resolution: Awaited<
      ReturnType<BusinessAccessResolverService['resolveForBusiness']>
    >,
  ): SubscriptionActionDefinition[] {
    const billingSource =
      subscription?.billingSource ?? SubscriptionBillingSource.NOT_SELECTED;
    const subStatus = subscription?.status;
    const paymentStatus = subscription?.paymentStatus;
    const hasPlanTier = Boolean(subscription?.planTierId);

    const isSuspended = businessStatus === BusinessStatus.SUSPENDED;
    const isActiveBusiness = businessStatus === BusinessStatus.ACTIVE;
    const isCanceled = subStatus === SubscriptionStatus.CANCELED;
    const isExpired = subStatus === SubscriptionStatus.EXPIRED;
    const isPending =
      subStatus === SubscriptionStatus.PENDING_PAYMENT ||
      paymentStatus === SubscriptionPaymentStatus.PENDING;
    const isTrialing = subStatus === SubscriptionStatus.TRIALING;
    const isInternalStatus = subStatus === SubscriptionStatus.INTERNAL;
    const isTerminal = isCanceled || isExpired;
    const isStripe = billingSource === SubscriptionBillingSource.STRIPE;
    const isInternalBilling =
      billingSource === SubscriptionBillingSource.INTERNAL;

    const def = (
      key: SubscriptionActionKey,
      partial: Omit<SubscriptionActionDefinition, 'key'>,
    ): SubscriptionActionDefinition => ({ key, ...partial });

    const baseActions: SubscriptionActionDefinition[] = [
      def('MARK_PAID', {
        label: 'Mark Paid',
        category: isPending ? 'recommended' : 'billing',
        visible: isPending || isTrialing,
        enabled: isPending || (isTrialing && !isSuspended),
        disabledReason: isSuspended
          ? 'Cannot mark paid while business is suspended'
          : !isPending && !isTrialing
            ? 'Subscription is not pending payment'
            : undefined,
        severity: 'safe',
        requiresConfirmation: false,
        requiresInput: true,
      }),
      def('RECORD_PAYMENT', {
        label: 'Record Payment',
        category: 'billing',
        visible: !isSuspended,
        enabled: !isSuspended,
        severity: 'safe',
        requiresConfirmation: false,
        requiresInput: true,
      }),
      def('MOVE_PENDING', {
        label: 'Move to Pending Payment',
        category: 'billing',
        visible: !isPending && !isSuspended && !isTerminal,
        enabled: !isPending && isActiveBusiness && !isInternalStatus,
        disabledReason: isPending
          ? 'Already pending payment'
          : isInternalStatus
            ? 'Internal subscriptions do not require payment'
            : undefined,
        severity: 'warning',
        requiresConfirmation: true,
        requiresInput: false,
      }),
      def('EXTEND_TRIAL', {
        label: 'Extend Trial',
        category: 'trial',
        visible: isTrialing || isExpired,
        enabled: (isTrialing || isExpired) && !isSuspended,
        severity: 'safe',
        requiresConfirmation: false,
        requiresInput: true,
      }),
      def('CANCEL_SUBSCRIPTION', {
        label: 'Cancel Subscription',
        category: 'danger',
        visible: !isCanceled && !isInternalBilling,
        enabled: Boolean(subscription) && !isCanceled && !isSuspended,
        disabledReason: isCanceled
          ? 'Subscription is already canceled'
          : undefined,
        severity: 'danger',
        requiresConfirmation: true,
        requiresInput: false,
      }),
      def('EXPIRE_TRIAL', {
        label: 'Expire Trial',
        category: 'danger',
        visible: isTrialing && !isExpired,
        enabled: isTrialing && !isSuspended,
        disabledReason: !isTrialing
          ? 'Subscription is not trialing'
          : undefined,
        severity: 'danger',
        requiresConfirmation: true,
        requiresInput: false,
      }),
      def('SUSPEND_BUSINESS', {
        label: 'Suspend Business',
        category: 'danger',
        visible: !isSuspended,
        enabled: !isSuspended,
        disabledReason: isSuspended
          ? 'Business is already suspended'
          : undefined,
        severity: 'danger',
        requiresConfirmation: true,
        requiresInput: false,
      }),
      def('REACTIVATE_BUSINESS', {
        label: 'Reactivate Business',
        category: isSuspended || isTerminal ? 'recommended' : 'access',
        visible: isSuspended || isTerminal || !resolution.canAccessWorkspace,
        enabled: isSuspended || isTerminal || !resolution.canAccessWorkspace,
        severity: 'warning',
        requiresConfirmation: true,
        requiresInput: true,
      }),
      def('CHANGE_PACKAGE', {
        label: 'Change Package',
        category: 'package',
        visible: !isSuspended,
        enabled: !isSuspended && hasPlanTier,
        disabledReason: !hasPlanTier
          ? 'Assign a plan tier before changing package'
          : undefined,
        severity: 'warning',
        requiresConfirmation: true,
        requiresInput: true,
      }),
      def('CHANGE_SNAPSHOT', {
        label: 'Change Snapshot',
        category: 'snapshot',
        visible: !isSuspended,
        enabled: !isSuspended,
        severity: 'warning',
        requiresConfirmation: true,
        requiresInput: true,
      }),
      def('SYNC_CAPABILITIES', {
        label: 'Sync Capabilities',
        category: 'package',
        visible: !isSuspended,
        enabled: hasPlanTier && !isSuspended,
        disabledReason: !hasPlanTier ? 'No plan tier assigned' : undefined,
        severity: 'warning',
        requiresConfirmation: true,
        requiresInput: false,
      }),
      def('MANUAL_ADJUSTMENT', {
        label: 'Manual Adjustment',
        category: 'access',
        visible: true,
        enabled: true,
        severity: 'warning',
        requiresConfirmation: true,
        requiresInput: true,
      }),
    ];

    const stripeActions: SubscriptionActionDefinition[] = isStripe
      ? [
          def('OPEN_STRIPE_PORTAL', {
            label: 'Manage Billing',
            category: 'billing',
            visible: true,
            enabled: Boolean(subscription),
            severity: 'safe',
            requiresConfirmation: false,
            requiresInput: false,
          }),
          def('RESYNC_FROM_STRIPE', {
            label: 'Resync from Stripe',
            category: 'billing',
            visible: true,
            enabled: Boolean(subscription),
            severity: 'safe',
            requiresConfirmation: true,
            requiresInput: false,
          }),
        ]
      : [];

    return [...baseActions, ...stripeActions].map((action) =>
      this.applyBillingSourceGating(action, billingSource),
    );
  }

  private applyBillingSourceGating(
    action: SubscriptionActionDefinition,
    billingSource: SubscriptionBillingSource,
  ): SubscriptionActionDefinition {
    if (!isActionVisibleForBillingSource(action.key, billingSource)) {
      return {
        ...action,
        visible: false,
        enabled: false,
        disabledReason:
          billingSource === SubscriptionBillingSource.STRIPE
            ? STRIPE_MANAGED_MESSAGE
            : 'Action is not available for this billing source',
      };
    }

    if (
      billingSource === SubscriptionBillingSource.STRIPE &&
      action.key === 'MANUAL_ADJUSTMENT'
    ) {
      return {
        ...action,
        visible: false,
        enabled: false,
        disabledReason: STRIPE_MANAGED_MESSAGE,
      };
    }

    return action;
  }
}
