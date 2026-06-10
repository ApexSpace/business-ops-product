import { Injectable } from '@nestjs/common';
import {
  BusinessCapabilityAssignmentStatus,
  BusinessMemberRole,
  BusinessStatus,
  MembershipStatus,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  BusinessAccessReasonCode,
  BusinessAccessResolution,
  EffectiveCapability,
  NeedsAttentionFlag,
} from '../types/business-access-resolution.types';
import { BusinessEffectiveCapabilitiesService } from './business-effective-capabilities.service';

export interface BusinessAccessResolverInput {
  businessId: string;
  businessStatus: BusinessStatus;
  snapshotId?: string | null;
  snapshotAppliedAt?: Date | null;
  snapshotUpdatedAt?: Date | null;
  subscription?: {
    status: SubscriptionStatus;
    planTierId?: string | null;
    paymentStatus: SubscriptionPaymentStatus;
    currentPeriodEnd?: Date | null;
  } | null;
  capabilities: EffectiveCapability[];
  hasPendingOwnerInvite?: boolean;
}

const REASON_LABELS: Record<BusinessAccessReasonCode, string> = {
  ACCESS_GRANTED: 'Workspace access is granted.',
  BUSINESS_SUSPENDED: 'Workspace is suspended.',
  BUSINESS_NOT_ACTIVE: 'Workspace is not active yet.',
  NO_SUBSCRIPTION: 'No subscription is configured.',
  SUBSCRIPTION_ACTIVE: 'Active subscription.',
  SUBSCRIPTION_TRIALING: 'Trial is active.',
  TRIAL_EXPIRED: 'Trial has expired.',
  SUBSCRIPTION_INTERNAL: 'Internal workspace access.',
  SUBSCRIPTION_PENDING_PAYMENT: 'Payment is pending.',
  SUBSCRIPTION_EXPIRED: 'Subscription has expired.',
  SUBSCRIPTION_CANCELED: 'Subscription is canceled.',
  SUBSCRIPTION_PAST_DUE: 'Subscription payment is past due.',
  SUBSCRIPTION_UNKNOWN: 'Subscription does not allow access.',
};

const NEEDS_ATTENTION_LABELS: Record<NeedsAttentionFlag, string> = {
  TRIAL_EXPIRED: 'Trial expired',
  PENDING_PAYMENT: 'Pending payment',
  ACTIVE_WITH_EXPIRED_SUBSCRIPTION: 'Active business with expired subscription',
  ACTIVE_WITH_CANCELED_SUBSCRIPTION: 'Active business with canceled subscription',
  NO_PLAN_TIER: 'No plan tier assigned',
  NO_CAPABILITIES: 'No capabilities assigned',
  SNAPSHOT_NOT_APPLIED: 'Snapshot not applied',
  OWNER_INVITED_WHILE_INACTIVE: 'Owner invited while workspace inactive',
};

/**
 * Access resolution rules:
 * - Access gate: businessStatus === ACTIVE AND subscription.status in allowed set.
 * - paymentStatus is informational / needsAttention only (except PENDING_PAYMENT subscription).
 * - ARCHIVED business + PAST_DUE subscription: legacy values, treated as blocked.
 * - TRIALING: access while currentPeriodEnd >= now.
 */
@Injectable()
export class BusinessAccessResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly effectiveCapabilitiesService: BusinessEffectiveCapabilitiesService,
  ) {}

  resolve(input: BusinessAccessResolverInput): BusinessAccessResolution {
    const now = new Date();
    const needsAttention: NeedsAttentionFlag[] = [];
    const warnings: string[] = [];

    const effectiveCapabilities = input.capabilities.filter(Boolean);

    const sub = input.subscription;

    if (sub?.status === SubscriptionStatus.TRIALING && sub.currentPeriodEnd) {
      if (sub.currentPeriodEnd < now) {
        needsAttention.push('TRIAL_EXPIRED');
      }
    }

    if (
      sub?.status === SubscriptionStatus.PENDING_PAYMENT ||
      sub?.paymentStatus === SubscriptionPaymentStatus.PENDING
    ) {
      needsAttention.push('PENDING_PAYMENT');
    }

    if (
      input.businessStatus === BusinessStatus.ACTIVE &&
      sub?.status === SubscriptionStatus.EXPIRED
    ) {
      needsAttention.push('ACTIVE_WITH_EXPIRED_SUBSCRIPTION');
    }

    if (
      input.businessStatus === BusinessStatus.ACTIVE &&
      sub?.status === SubscriptionStatus.CANCELED
    ) {
      needsAttention.push('ACTIVE_WITH_CANCELED_SUBSCRIPTION');
    }

    if (!sub?.planTierId && sub?.status !== SubscriptionStatus.INTERNAL) {
      needsAttention.push('NO_PLAN_TIER');
    }

    if (effectiveCapabilities.length === 0) {
      needsAttention.push('NO_CAPABILITIES');
    }

    if (input.snapshotId && this.isSnapshotNotApplied(input)) {
      needsAttention.push('SNAPSHOT_NOT_APPLIED');
    }

    if (
      input.hasPendingOwnerInvite &&
      input.businessStatus !== BusinessStatus.ACTIVE
    ) {
      needsAttention.push('OWNER_INVITED_WHILE_INACTIVE');
    }

    for (const flag of needsAttention) {
      warnings.push(NEEDS_ATTENTION_LABELS[flag]);
    }

    const { canAccessWorkspace, reasonCode } = this.resolveAccess(
      input.businessStatus,
      sub,
      now,
    );

    return {
      canAccessWorkspace,
      reasonCode,
      reasonLabel: REASON_LABELS[reasonCode],
      warnings,
      needsAttention,
      effectiveCapabilities,
    };
  }

  async resolveForBusiness(businessId: string): Promise<BusinessAccessResolution> {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      include: {
        snapshot: { select: { id: true, updatedAt: true } },
        subscription: true,
        capabilities: {
          where: { status: BusinessCapabilityAssignmentStatus.ACTIVE },
          include: { capability: { select: { key: true, name: true } } },
        },
      },
    });

    if (!business) {
      return this.resolve({
        businessId,
        businessStatus: BusinessStatus.NOT_ACTIVE,
        capabilities: [],
      });
    }

    const [hasPendingOwnerInvite, effectiveCapabilities] = await Promise.all([
      this.hasPendingOwnerInvite(businessId),
      this.effectiveCapabilitiesService.resolveEffectiveCapabilities(businessId),
    ]);

    return this.resolve({
      businessId,
      businessStatus: business.status,
      snapshotId: business.snapshotId,
      snapshotAppliedAt: business.snapshotAppliedAt,
      snapshotUpdatedAt: business.snapshot?.updatedAt ?? null,
      subscription: business.subscription
        ? {
            status: business.subscription.status,
            planTierId: business.subscription.planTierId,
            paymentStatus: business.subscription.paymentStatus,
            currentPeriodEnd: business.subscription.currentPeriodEnd,
          }
        : null,
      capabilities: effectiveCapabilities,
      hasPendingOwnerInvite,
    });
  }

  private async hasPendingOwnerInvite(businessId: string): Promise<boolean> {
    const invite = await this.prisma.businessMembership.findFirst({
      where: {
        businessId,
        role: BusinessMemberRole.OWNER,
        status: MembershipStatus.INVITED,
      },
    });
    return Boolean(invite);
  }

  private isSnapshotNotApplied(input: BusinessAccessResolverInput): boolean {
    if (!input.snapshotId) {
      return false;
    }
    if (!input.snapshotAppliedAt) {
      return true;
    }
    if (
      input.snapshotUpdatedAt &&
      input.snapshotAppliedAt < input.snapshotUpdatedAt
    ) {
      return true;
    }
    return false;
  }

  private resolveAccess(
    businessStatus: BusinessStatus,
    sub: BusinessAccessResolverInput['subscription'],
    now: Date,
  ): { canAccessWorkspace: boolean; reasonCode: BusinessAccessReasonCode } {
    if (businessStatus === BusinessStatus.SUSPENDED) {
      return { canAccessWorkspace: false, reasonCode: 'BUSINESS_SUSPENDED' };
    }

    if (businessStatus === BusinessStatus.NOT_ACTIVE) {
      return { canAccessWorkspace: false, reasonCode: 'BUSINESS_NOT_ACTIVE' };
    }

    if (businessStatus !== BusinessStatus.ACTIVE) {
      return { canAccessWorkspace: false, reasonCode: 'BUSINESS_NOT_ACTIVE' };
    }

    if (!sub) {
      return { canAccessWorkspace: false, reasonCode: 'NO_SUBSCRIPTION' };
    }

    switch (sub.status) {
      case SubscriptionStatus.ACTIVE:
        return { canAccessWorkspace: true, reasonCode: 'SUBSCRIPTION_ACTIVE' };
      case SubscriptionStatus.TRIALING: {
        if (sub.currentPeriodEnd && sub.currentPeriodEnd >= now) {
          return {
            canAccessWorkspace: true,
            reasonCode: 'SUBSCRIPTION_TRIALING',
          };
        }
        return { canAccessWorkspace: false, reasonCode: 'TRIAL_EXPIRED' };
      }
      case SubscriptionStatus.INTERNAL:
        return { canAccessWorkspace: true, reasonCode: 'SUBSCRIPTION_INTERNAL' };
      case SubscriptionStatus.PENDING_PAYMENT:
        return {
          canAccessWorkspace: false,
          reasonCode: 'SUBSCRIPTION_PENDING_PAYMENT',
        };
      case SubscriptionStatus.EXPIRED:
        return { canAccessWorkspace: false, reasonCode: 'SUBSCRIPTION_EXPIRED' };
      case SubscriptionStatus.CANCELED:
        return { canAccessWorkspace: false, reasonCode: 'SUBSCRIPTION_CANCELED' };
      case SubscriptionStatus.PAST_DUE:
        return { canAccessWorkspace: false, reasonCode: 'SUBSCRIPTION_PAST_DUE' };
      default:
        return { canAccessWorkspace: false, reasonCode: 'SUBSCRIPTION_UNKNOWN' };
    }
  }
}
