import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  BusinessAddonSource,
  BusinessAddonStatus,
  BusinessFeatureGrantSource,
  BusinessFeatureGrantStatus,
  BusinessMemberRole,
  BusinessSubscriptionBillingCycle,
  EmailMessageStatus,
  EntitlementChangeCampaignMemberStatus,
  EntitlementChangeCampaignPolicy,
  EntitlementChangeCampaignStatus,
  EntitlementChangeCampaignType,
  MembershipStatus,
  Prisma,
  SubscriptionBillingSource,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { getPaginationParams } from '@app/common/utils/pagination.util';
import { PrismaService } from '@app/core/database/prisma.service';
import { formatUserName } from '@app/modules/communications/email/utils/email-variables.util';
import { EmailNotificationService } from '@app/modules/communications/email/services/email-notification.service';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { BusinessAddonSyncService } from '@app/modules/platform/business/services/business-addon-sync.service';
import { BusinessCapabilitySyncService } from '@app/modules/platform/business/services/business-capability-sync.service';
import { EntitlementService } from '@app/modules/platform/business/services/entitlement.service';
import { StripePlatformSubscriptionService } from '@app/modules/platform/billing/stripe/services/stripe-platform-subscription.service';
import { StripePlatformTierPriceSyncService } from '@app/modules/platform/billing/stripe/services/stripe-platform-tier-price-sync.service';
import {
  CampaignExtendDto,
  CampaignMembersPatchDto,
  CampaignMigrateDto,
  CampaignNotifyDto,
  CreateCampaignDto,
  ListCampaignsQueryDto,
} from '../dto/operations-campaign.dto';
import {
  formatEntitlementChangeDetail,
  mergeEntitlementChangeDiff,
  readDiffFromPayload,
} from '../utils/entitlement-change-diff.util';

const OPEN_STATUSES: EntitlementChangeCampaignStatus[] = [
  EntitlementChangeCampaignStatus.OPEN,
  EntitlementChangeCampaignStatus.NOTIFIED,
  EntitlementChangeCampaignStatus.DUE,
];

const ACTIVE_MEMBER_STATUSES: EntitlementChangeCampaignMemberStatus[] = [
  EntitlementChangeCampaignMemberStatus.PENDING,
  EntitlementChangeCampaignMemberStatus.NOTIFIED,
  EntitlementChangeCampaignMemberStatus.EXTENDED,
];

@Injectable()
export class OperationsCampaignService {
  private readonly logger = new Logger(OperationsCampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly auditService: AuditService,
    private readonly entitlementService: EntitlementService,
    private readonly capabilitySync: BusinessCapabilitySyncService,
    private readonly addonSync: BusinessAddonSyncService,
    private readonly stripeSubscriptions: StripePlatformSubscriptionService,
    private readonly stripeTierPriceSync: StripePlatformTierPriceSyncService,
  ) {}

  async createCampaign(dto: CreateCampaignDto, actor?: RequestUser) {
    if (!dto.businessIds?.length) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Campaign requires at least one business',
        HttpStatus.BAD_REQUEST,
      );
    }

    const effectiveAt = dto.effectiveAt ? new Date(dto.effectiveAt) : null;
    const campaign = await this.prisma.entitlementChangeCampaign.create({
      data: {
        type: dto.type,
        policy: dto.policy ?? EntitlementChangeCampaignPolicy.KEEP_GRANDFATHERED,
        summary: dto.summary.trim(),
        message: dto.message?.trim(),
        tierId: dto.tierId,
        addonId: dto.addonId,
        capabilityId: dto.capabilityId,
        featureKeys: dto.featureKeys ?? [],
        payload: (dto.payload ?? undefined) as Prisma.InputJsonValue | undefined,
        effectiveAt,
        autoForce: dto.autoForce ?? true,
        createdByUserId: actor?.id,
        members: {
          create: dto.businessIds.map((businessId) => ({
            businessId,
            effectiveAt,
          })),
        },
      },
      include: this.campaignInclude(),
    });

    if (actor) {
      await this.auditService.log({
        actorUserId: actor.id,
        action: 'platform.operations.campaign_created',
        entityType: 'EntitlementChangeCampaign',
        entityId: campaign.id,
        metadata: {
          type: campaign.type,
          businessCount: dto.businessIds.length,
        },
      });
    }

    return this.toCampaignDto(campaign);
  }

  /**
   * Open or merge an open campaign of the same type+target for affected businesses.
   */
  async openOrMergeCampaign(input: {
    type: EntitlementChangeCampaignType;
    summary: string;
    message?: string;
    policy?: EntitlementChangeCampaignPolicy;
    tierId?: string | null;
    addonId?: string | null;
    capabilityId?: string | null;
    featureKeys?: string[];
    businessIds: string[];
    effectiveAt?: Date | null;
    autoForce?: boolean;
    payload?: Record<string, unknown>;
    actor?: RequestUser;
  }) {
    if (input.businessIds.length === 0) {
      return null;
    }

    const existing = await this.prisma.entitlementChangeCampaign.findFirst({
      where: {
        type: input.type,
        status: { in: OPEN_STATUSES },
        ...(input.tierId ? { tierId: input.tierId } : {}),
        ...(input.addonId ? { addonId: input.addonId } : {}),
        ...(input.capabilityId ? { capabilityId: input.capabilityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const existingMembers =
        await this.prisma.entitlementChangeCampaignMember.findMany({
          where: { campaignId: existing.id },
          select: { businessId: true },
        });
      const have = new Set(existingMembers.map((m) => m.businessId));
      const toAdd = input.businessIds.filter((id) => !have.has(id));
      if (toAdd.length) {
        await this.prisma.entitlementChangeCampaignMember.createMany({
          data: toAdd.map((businessId) => ({
            campaignId: existing.id,
            businessId,
            effectiveAt: input.effectiveAt ?? existing.effectiveAt,
          })),
          skipDuplicates: true,
        });
      }
      if (input.payload) {
        const existingPayload =
          existing.payload &&
          typeof existing.payload === 'object' &&
          !Array.isArray(existing.payload)
            ? (existing.payload as Record<string, unknown>)
            : {};
        const mergedDiff = mergeEntitlementChangeDiff(
          readDiffFromPayload(existingPayload),
          readDiffFromPayload(input.payload),
        );
        const mergedFeatureKeys = [
          ...new Set([
            ...(Array.isArray(existing.featureKeys)
              ? (existing.featureKeys as string[])
              : []),
            ...(input.featureKeys ?? []),
          ]),
        ];
        const nextPayload: Record<string, unknown> = {
          ...existingPayload,
          ...input.payload,
          diff: mergedDiff,
        };
        const detailMessage = formatEntitlementChangeDetail({
          type: input.type,
          diff: mergedDiff,
          fallbackMessage: input.message ?? existing.message,
        });
        await this.prisma.entitlementChangeCampaign.update({
          where: { id: existing.id },
          data: {
            payload: nextPayload as Prisma.InputJsonValue,
            summary: input.summary.trim(),
            message: detailMessage,
            ...(mergedFeatureKeys.length
              ? { featureKeys: mergedFeatureKeys }
              : {}),
          },
        });
      }
      return this.getById(existing.id);
    }

    const createDiff = readDiffFromPayload(input.payload);
    const createMessage = formatEntitlementChangeDetail({
      type: input.type,
      diff: createDiff,
      fallbackMessage: input.message,
    });

    return this.createCampaign(
      {
        type: input.type,
        summary: input.summary,
        message: createMessage,
        policy: input.policy,
        tierId: input.tierId ?? undefined,
        addonId: input.addonId ?? undefined,
        capabilityId: input.capabilityId ?? undefined,
        featureKeys: input.featureKeys,
        businessIds: input.businessIds,
        effectiveAt: input.effectiveAt?.toISOString(),
        autoForce: input.autoForce,
        payload: input.payload,
      },
      input.actor,
    );
  }

  async list(query: ListCampaignsQueryDto) {
    const { page, limit, skip } = getPaginationParams(query);
    const where: Prisma.EntitlementChangeCampaignWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.tierId ? { tierId: query.tierId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.entitlementChangeCampaign.findMany({
        where,
        include: this.campaignInclude(),
        orderBy: [{ status: 'asc' }, { effectiveAt: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.entitlementChangeCampaign.count({ where }),
    ]);

    return {
      items: items.map((c) => this.toCampaignDto(c)),
      meta: { total, page, limit },
    };
  }

  async getById(id: string) {
    const campaign = await this.requireCampaign(id);
    return this.toCampaignDto(campaign);
  }

  async notify(id: string, dto: CampaignNotifyDto, actor: RequestUser) {
    const campaign = await this.requireCampaign(id);
    const members = await this.resolveTargetMembers(campaign.id, dto.businessIds);
    if (members.length === 0) {
      return { notifiedCount: 0, campaign: await this.getById(id) };
    }

    if (dto.effectiveAt) {
      const effectiveAt = new Date(dto.effectiveAt);
      await this.prisma.entitlementChangeCampaign.update({
        where: { id },
        data: { effectiveAt },
      });
      await this.prisma.entitlementChangeCampaignMember.updateMany({
        where: {
          campaignId: id,
          businessId: { in: members.map((m) => m.businessId) },
        },
        data: { effectiveAt },
      });
    }

    if (dto.message !== undefined) {
      await this.prisma.entitlementChangeCampaign.update({
        where: { id },
        data: { message: dto.message.trim() },
      });
    }

    const refreshed = await this.requireCampaign(id);
    const emailResult = await this.sendOwnerEmails({
      campaign: refreshed,
      businessIds: members.map((m) => m.businessId),
    });

    const now = new Date();
    await this.prisma.entitlementChangeCampaignMember.updateMany({
      where: {
        campaignId: id,
        businessId: { in: members.map((m) => m.businessId) },
        status: { in: ACTIVE_MEMBER_STATUSES },
      },
      data: {
        status: EntitlementChangeCampaignMemberStatus.NOTIFIED,
        notifiedAt: now,
      },
    });

    await this.prisma.entitlementChangeCampaign.update({
      where: { id },
      data: {
        status:
          refreshed.status === EntitlementChangeCampaignStatus.OPEN
            ? EntitlementChangeCampaignStatus.NOTIFIED
            : refreshed.status,
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.operations.campaign_notified',
      entityType: 'EntitlementChangeCampaign',
      entityId: id,
      metadata: {
        ...emailResult,
        businessIds: members.map((m) => m.businessId),
      },
    });

    return {
      notifiedCount: emailResult.queued,
      skippedCount: emailResult.skipped,
      failedCount: emailResult.failed,
      queued: emailResult.queued,
      skipped: emailResult.skipped,
      failed: emailResult.failed,
      campaign: await this.getById(id),
    };
  }

  async extend(id: string, dto: CampaignExtendDto, actor: RequestUser) {
    const campaign = await this.requireCampaign(id);
    const members = await this.resolveTargetMembers(campaign.id, dto.businessIds);
    if (members.length === 0) {
      return { extendedCount: 0, campaign: await this.getById(id) };
    }

    let nextDate: Date;
    if (dto.effectiveAt) {
      nextDate = new Date(dto.effectiveAt);
    } else if (dto.days != null) {
      const base =
        members[0]?.effectiveAt ??
        campaign.effectiveAt ??
        new Date();
      nextDate = new Date(base);
      nextDate.setDate(nextDate.getDate() + dto.days);
    } else {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Provide days or effectiveAt',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.entitlementChangeCampaignMember.updateMany({
      where: {
        campaignId: id,
        businessId: { in: members.map((m) => m.businessId) },
      },
      data: {
        effectiveAt: nextDate,
        status: EntitlementChangeCampaignMemberStatus.EXTENDED,
        included: true,
      },
    });

    // If extending all active included members, bump campaign date too.
    if (!dto.businessIds?.length) {
      await this.prisma.entitlementChangeCampaign.update({
        where: { id },
        data: {
          effectiveAt: nextDate,
          status: EntitlementChangeCampaignStatus.NOTIFIED,
        },
      });
    }

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.operations.campaign_extended',
      entityType: 'EntitlementChangeCampaign',
      entityId: id,
      metadata: {
        effectiveAt: nextDate.toISOString(),
        businessIds: members.map((m) => m.businessId),
      },
    });

    return {
      extendedCount: members.length,
      effectiveAt: nextDate.toISOString(),
      campaign: await this.getById(id),
    };
  }

  async migrate(id: string, dto: CampaignMigrateDto, actor?: RequestUser) {
    const campaign = await this.requireCampaign(id);
    const policy = dto.policy ?? campaign.policy;
    const members = await this.resolveTargetMembers(campaign.id, dto.businessIds, {
      requireIncluded: true,
      allowMigrated: false,
    });

    let migratedCount = 0;
    const failures: Array<{ businessId: string; message: string }> = [];

    for (const member of members) {
      try {
        await this.applyMigration(campaign, member.businessId, policy);
        await this.prisma.entitlementChangeCampaignMember.update({
          where: { id: member.id },
          data: {
            status: EntitlementChangeCampaignMemberStatus.MIGRATED,
            migratedAt: new Date(),
          },
        });
        migratedCount += 1;
      } catch (error) {
        const message =
          error instanceof AppException
            ? error.message
            : error instanceof Error
              ? error.message
              : String(error);
        failures.push({ businessId: member.businessId, message });
      }
    }

    await this.refreshCampaignCompletion(id);

    if (actor) {
      await this.auditService.log({
        actorUserId: actor.id,
        action: 'platform.operations.campaign_migrated',
        entityType: 'EntitlementChangeCampaign',
        entityId: id,
        metadata: {
          policy,
          migratedCount,
          failureCount: failures.length,
          businessIds: members.map((m) => m.businessId),
          failures,
        },
      });
    }

    if (migratedCount === 0 && failures.length > 0) {
      throw new AppException(
        ErrorCode.STRIPE_SUBSCRIPTION_UPDATE_FAILED,
        `Migration failed for all ${failures.length} business(es). First error: ${failures[0]?.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    return {
      migratedCount,
      failureCount: failures.length,
      failures,
      campaign: await this.getById(id),
    };
  }

  async patchMembers(
    id: string,
    dto: CampaignMembersPatchDto,
    actor: RequestUser,
  ) {
    await this.requireCampaign(id);
    await this.prisma.entitlementChangeCampaignMember.updateMany({
      where: {
        campaignId: id,
        businessId: { in: dto.businessIds },
      },
      data: {
        included: dto.included,
        status: dto.included
          ? EntitlementChangeCampaignMemberStatus.PENDING
          : EntitlementChangeCampaignMemberStatus.EXCLUDED,
      },
    });

    await this.auditService.log({
      actorUserId: actor.id,
      action: 'platform.operations.campaign_members_patched',
      entityType: 'EntitlementChangeCampaign',
      entityId: id,
      metadata: { included: dto.included, businessIds: dto.businessIds },
    });

    return this.getById(id);
  }

  /** Scheduler: mark due + auto-force migrate past-due included members. */
  async processDueCampaigns(): Promise<{ due: number; migrated: number }> {
    const now = new Date();
    let due = 0;
    let migrated = 0;

    const open = await this.prisma.entitlementChangeCampaign.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        autoForce: true,
      },
      include: { members: true },
    });

    for (const campaign of open) {
      const dueMembers = campaign.members.filter((m) => {
        if (!m.included) return false;
        if (m.status === EntitlementChangeCampaignMemberStatus.MIGRATED) {
          return false;
        }
        if (m.status === EntitlementChangeCampaignMemberStatus.EXCLUDED) {
          return false;
        }
        const effective = m.effectiveAt ?? campaign.effectiveAt;
        return effective != null && effective <= now;
      });

      if (dueMembers.length === 0) continue;

      if (campaign.status !== EntitlementChangeCampaignStatus.DUE) {
        await this.prisma.entitlementChangeCampaign.update({
          where: { id: campaign.id },
          data: { status: EntitlementChangeCampaignStatus.DUE },
        });
        due += 1;
      }

      try {
        const result = await this.migrate(campaign.id, {
          businessIds: dueMembers.map((m) => m.businessId),
        });
        migrated += result.migratedCount;
      } catch (error) {
        // Per-business migrate is fail-closed; do not abort other campaigns.
        this.logger.warn(
          `Auto-force migrate failed for campaign ${campaign.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return { due, migrated };
  }

  private async applyMigration(
    campaign: Awaited<ReturnType<typeof this.requireCampaign>>,
    businessId: string,
    policy: EntitlementChangeCampaignPolicy,
  ): Promise<void> {
    switch (campaign.type) {
      case EntitlementChangeCampaignType.ADDON_PACKAGING:
        await this.applyAddonMigration(campaign, businessId, policy);
        break;
      case EntitlementChangeCampaignType.TIER_PRICE:
        await this.applyTierPriceMigration(campaign, businessId);
        break;
      case EntitlementChangeCampaignType.TIER_CAPABILITY:
        await this.applyTierCapabilityMigration(businessId);
        break;
      case EntitlementChangeCampaignType.CAPABILITY_FEATURE:
        await this.applyFeatureMigration(campaign, businessId);
        break;
      default:
        break;
    }
    await this.entitlementService.invalidate(businessId);
  }

  private async applyAddonMigration(
    campaign: Awaited<ReturnType<typeof this.requireCampaign>>,
    businessId: string,
    policy: EntitlementChangeCampaignPolicy,
  ): Promise<void> {
    if (!campaign.addonId) return;

    if (policy === EntitlementChangeCampaignPolicy.CONVERT_TO_PURCHASED) {
      const addon = await this.prisma.addon.findFirst({
        where: { id: campaign.addonId, deletedAt: null },
      });
      const price = addon?.priceMonthly?.toNumber();
      if (price == null) {
        throw new AppException(
          ErrorCode.VALIDATION_ERROR,
          'Convert to paid requires a monthly price on the add-on',
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.prisma.businessAddon.updateMany({
        where: {
          addonId: campaign.addonId,
          businessId,
          status: BusinessAddonStatus.ACTIVE,
          source: BusinessAddonSource.INCLUDED,
        },
        data: {
          source: BusinessAddonSource.PURCHASED,
          priceAtPurchase: price,
        },
      });
      return;
    }

    // KEEP_GRANDFATHERED is the holding state; explicit migrate defaults to force remove.
    if (
      policy === EntitlementChangeCampaignPolicy.FORCE_REMOVE ||
      policy === EntitlementChangeCampaignPolicy.KEEP_GRANDFATHERED ||
      policy === EntitlementChangeCampaignPolicy.APPLY_NEW_PRICE
    ) {
      const sub = await this.prisma.businessSubscription.findUnique({
        where: { businessId },
        select: { planTierId: true },
      });
      if (sub?.planTierId) {
        await this.addonSync.syncIncludedFromTier(businessId, sub.planTierId);
      } else {
        await this.prisma.businessAddon.updateMany({
          where: {
            businessId,
            addonId: campaign.addonId,
            status: BusinessAddonStatus.ACTIVE,
            source: BusinessAddonSource.INCLUDED,
          },
          data: {
            status: BusinessAddonStatus.CANCELED,
            canceledAt: new Date(),
          },
        });
      }
    }
  }

  private async applyTierPriceMigration(
    campaign: Awaited<ReturnType<typeof this.requireCampaign>>,
    businessId: string,
  ): Promise<void> {
    const payload = (campaign.payload ?? {}) as {
      priceMonthly?: number | null;
      priceYearly?: number | null;
      tierVersionId?: string | null;
      tierId?: string | null;
    };

    const sub = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });
    if (!sub?.planTierId) return;

    const tierId = payload.tierId ?? campaign.tierId ?? sub.planTierId;
    const tier = await this.prisma.planTier.findFirst({
      where: { id: tierId, deletedAt: null },
    });
    if (!tier) return;

    const cycle = sub.billingCycle ?? BusinessSubscriptionBillingCycle.MONTHLY;
    const amount =
      cycle === BusinessSubscriptionBillingCycle.YEARLY
        ? (payload.priceYearly ?? tier.priceYearly?.toNumber() ?? null)
        : (payload.priceMonthly ?? tier.priceMonthly?.toNumber() ?? null);

    let tierVersionId = payload.tierVersionId ?? null;
    if (!tierVersionId) {
      const latest = await this.prisma.tierVersion.findFirst({
        where: { tierId },
        orderBy: { version: 'desc' },
      });
      tierVersionId = latest?.id ?? null;
    }

    if (sub.billingSource === SubscriptionBillingSource.STRIPE) {
      // Stripe-owned: remap Price only; amount/status come from webhooks.
      await this.stripeTierPriceSync.assertPriceIdsPresent(tierId);
      await this.stripeSubscriptions.updateSubscriptionTier({
        businessId,
        planGroupId: sub.planGroupId,
        planTierId: tierId,
        billingCycle: cycle,
        prorationBehavior: 'none',
      });
      if (tierVersionId) {
        await this.prisma.businessSubscription.update({
          where: { businessId },
          data: { tierVersionId },
        });
      }
      return;
    }

    await this.prisma.businessSubscription.update({
      where: { businessId },
      data: {
        amount,
        priceAtPurchase: amount,
        ...(tierVersionId ? { tierVersionId } : {}),
      },
    });
  }

  private async applyTierCapabilityMigration(businessId: string): Promise<void> {
    const sub = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
      select: { planTierId: true },
    });
    if (!sub?.planTierId) return;
    await this.capabilitySync.syncFromPlanTier(businessId, sub.planTierId);
  }

  private async applyFeatureMigration(
    campaign: Awaited<ReturnType<typeof this.requireCampaign>>,
    businessId: string,
  ): Promise<void> {
    const keys = Array.isArray(campaign.featureKeys)
      ? (campaign.featureKeys as string[])
      : [];
    await this.prisma.businessFeatureGrant.updateMany({
      where: {
        businessId,
        status: BusinessFeatureGrantStatus.ACTIVE,
        source: BusinessFeatureGrantSource.GRANDFATHERED,
        ...(keys.length ? { featureKey: { in: keys } } : {}),
      },
      data: {
        status: BusinessFeatureGrantStatus.REVOKED,
        revokedAt: new Date(),
      },
    });
  }

  private async sendOwnerEmails(input: {
    campaign: Awaited<ReturnType<typeof this.requireCampaign>>;
    businessIds: string[];
  }): Promise<{ queued: number; skipped: number; failed: number }> {
    const memberships = await this.prisma.businessMembership.findMany({
      where: {
        businessId: { in: input.businessIds },
        role: BusinessMemberRole.OWNER,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        business: { select: { id: true, name: true } },
      },
    });

    // Intentional Ops Email click: clear stuck in-flight rows for this campaign
    // so a new batch is not blocked while the worker was down.
    await this.prisma.emailMessage.updateMany({
      where: {
        emailType: 'platform.entitlement_change',
        entityType: 'EntitlementChangeCampaign',
        entityId: input.campaign.id,
        businessId: { in: input.businessIds },
        status: {
          in: [EmailMessageStatus.QUEUED, EmailMessageStatus.SENDING],
        },
      },
      data: {
        status: EmailMessageStatus.FAILED,
        errorMessage: 'Superseded by Operations email resend',
      },
    });

    const effective =
      input.campaign.effectiveAt?.toISOString().slice(0, 10) ?? 'TBD';
    const detail = this.buildChangeDetail(input.campaign);
    // Unique per Email click so Ops can intentionally resend.
    const batchId = `${Date.now()}`;

    let queued = 0;
    let skipped = 0;
    let failed = 0;

    for (const membership of memberships) {
      const email = membership.user.email?.trim();
      if (!email) continue;
      try {
        // BullMQ jobId cannot contain ':' — use hyphens only.
        const idempotencyKey = [
          'entitlement-change',
          input.campaign.id,
          membership.businessId,
          batchId,
        ].join('-');

        const result =
          await this.emailNotificationService.enqueueTransactionalEmail({
            businessId: membership.businessId,
            emailType: 'platform.entitlement_change',
            toEmail: email,
            userId: membership.user.id,
            entityType: 'EntitlementChangeCampaign',
            entityId: input.campaign.id,
            idempotencyKey,
            variables: {
              'owner.name': formatUserName(membership.user) || 'there',
              'owner.email': email,
              'business.name': membership.business.name,
              'change.summary': input.campaign.summary,
              'change.detail': detail,
              'change.effective': `Effective date: ${effective}`,
            },
          });

        if (result === 'queued') queued += 1;
        else if (result === 'skipped') skipped += 1;
        else if (result === 'failed') failed += 1;
        else if (result === 'disabled') {
          failed += 1;
          this.logger.warn(
            `Entitlement change email disabled/unavailable for ${membership.businessId} (${email})`,
          );
        }
      } catch (err) {
        failed += 1;
        this.logger.warn(
          `Failed to enqueue entitlement change email for ${membership.businessId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
    return { queued, skipped, failed };
  }

  private buildChangeDetail(
    campaign: Awaited<ReturnType<typeof this.requireCampaign>>,
  ): string {
    const diff = readDiffFromPayload(campaign.payload);
    const formatted = formatEntitlementChangeDetail({
      type: campaign.type,
      diff,
      fallbackMessage: campaign.message,
    });
    if (diff) {
      return formatted;
    }

    // Legacy campaigns without structured diff — keep stored message or type defaults.
    if (campaign.message?.trim()) {
      return campaign.message.trim();
    }

    const payload = (campaign.payload ?? {}) as {
      previousPriceMonthly?: number | null;
      previousPriceYearly?: number | null;
      priceMonthly?: number | null;
      priceYearly?: number | null;
      featureKeys?: string[];
    };

    if (campaign.type === EntitlementChangeCampaignType.TIER_PRICE) {
      const oldMo = formatCampaignMoney(payload.previousPriceMonthly);
      const newMo = formatCampaignMoney(payload.priceMonthly);
      const oldYr = formatCampaignMoney(payload.previousPriceYearly);
      const newYr = formatCampaignMoney(payload.priceYearly);
      return `Monthly price ${oldMo} → ${newMo}. Yearly price ${oldYr} → ${newYr}. Your current rate stays until the effective date.`;
    }

    if (campaign.type === EntitlementChangeCampaignType.TIER_CAPABILITY) {
      return 'Some capabilities are no longer included in your tier. Upgrade or buy an add-on to keep access after the effective date.';
    }

    if (campaign.type === EntitlementChangeCampaignType.CAPABILITY_FEATURE) {
      const keys = Array.isArray(campaign.featureKeys)
        ? (campaign.featureKeys as string[])
        : payload.featureKeys ?? [];
      const listed = keys.length ? ` (${keys.join(', ')})` : '';
      return `One or more services${listed} are no longer included. Upgrade your plan or purchase an add-on to keep them after the effective date.`;
    }

    if (campaign.type === EntitlementChangeCampaignType.ADDON_PACKAGING) {
      return 'An included add-on is no longer part of your tier packaging. Upgrade or purchase it separately to keep access after the effective date.';
    }

    return formatted;
  }

  private async resolveTargetMembers(
    campaignId: string,
    businessIds?: string[],
    opts?: { requireIncluded?: boolean; allowMigrated?: boolean },
  ) {
    return this.prisma.entitlementChangeCampaignMember.findMany({
      where: {
        campaignId,
        ...(businessIds?.length ? { businessId: { in: businessIds } } : {}),
        ...(opts?.requireIncluded !== false ? { included: true } : {}),
        ...(opts?.allowMigrated
          ? {}
          : {
              status: {
                notIn: [
                  EntitlementChangeCampaignMemberStatus.MIGRATED,
                  EntitlementChangeCampaignMemberStatus.EXCLUDED,
                ],
              },
            }),
      },
    });
  }

  private async refreshCampaignCompletion(id: string) {
    const remaining =
      await this.prisma.entitlementChangeCampaignMember.count({
        where: {
          campaignId: id,
          included: true,
          status: {
            in: ACTIVE_MEMBER_STATUSES,
          },
        },
      });

    if (remaining === 0) {
      await this.prisma.entitlementChangeCampaign.update({
        where: { id },
        data: {
          status: EntitlementChangeCampaignStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }
  }

  private async requireCampaign(id: string) {
    const campaign = await this.prisma.entitlementChangeCampaign.findUnique({
      where: { id },
      include: this.campaignInclude(),
    });
    if (!campaign) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Campaign not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return campaign;
  }

  private campaignInclude() {
    return {
      tier: { select: { id: true, name: true, key: true } },
      addon: { select: { id: true, name: true, key: true } },
      capability: { select: { id: true, name: true, key: true } },
      members: {
        include: {
          business: {
            select: {
              id: true,
              name: true,
              subscription: {
                select: {
                  planTierId: true,
                  planTier: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    } satisfies Prisma.EntitlementChangeCampaignInclude;
  }

  private toCampaignDto(
    campaign: Awaited<ReturnType<typeof this.requireCampaign>>,
  ) {
    const pendingMembers = campaign.members.filter(
      (m) =>
        m.included &&
        m.status !== EntitlementChangeCampaignMemberStatus.MIGRATED &&
        m.status !== EntitlementChangeCampaignMemberStatus.EXCLUDED,
    );

    const byTier = new Map<
      string,
      {
        tierId: string | null;
        tierName: string | null;
        businesses: Array<{
          id: string;
          businessId: string;
          businessName: string;
          included: boolean;
          status: EntitlementChangeCampaignMemberStatus;
          effectiveAt: string | null;
          notifiedAt: string | null;
          migratedAt: string | null;
        }>;
      }
    >();

    for (const member of campaign.members) {
      const tierId = member.business.subscription?.planTierId ?? null;
      const tierName = member.business.subscription?.planTier?.name ?? null;
      const key = tierId ?? '__none__';
      if (!byTier.has(key)) {
        byTier.set(key, { tierId, tierName, businesses: [] });
      }
      byTier.get(key)!.businesses.push({
        id: member.id,
        businessId: member.businessId,
        businessName: member.business.name,
        included: member.included,
        status: member.status,
        effectiveAt: member.effectiveAt?.toISOString() ?? null,
        notifiedAt: member.notifiedAt?.toISOString() ?? null,
        migratedAt: member.migratedAt?.toISOString() ?? null,
      });
    }

    return {
      id: campaign.id,
      type: campaign.type,
      status: campaign.status,
      policy: campaign.policy,
      summary: campaign.summary,
      message: campaign.message,
      description: this.buildChangeDetail(campaign),
      tierId: campaign.tierId,
      tierName: campaign.tier?.name ?? null,
      addonId: campaign.addonId,
      addonName: campaign.addon?.name ?? null,
      capabilityId: campaign.capabilityId,
      capabilityName: campaign.capability?.name ?? null,
      featureKeys: Array.isArray(campaign.featureKeys)
        ? (campaign.featureKeys as string[])
        : [],
      payload: campaign.payload,
      diff: readDiffFromPayload(campaign.payload),
      priceChange: this.extractPriceChange(campaign.payload),
      effectiveAt: campaign.effectiveAt?.toISOString() ?? null,
      autoForce: campaign.autoForce,
      pendingCount: pendingMembers.length,
      memberCount: campaign.members.length,
      createdAt: campaign.createdAt.toISOString(),
      completedAt: campaign.completedAt?.toISOString() ?? null,
      groups: Array.from(byTier.values()),
    };
  }

  private extractPriceChange(payload: unknown) {
    if (!payload || typeof payload !== 'object') return null;
    const p = payload as Record<string, unknown>;
    if (
      p.previousPriceMonthly === undefined &&
      p.priceMonthly === undefined &&
      p.previousPriceYearly === undefined &&
      p.priceYearly === undefined
    ) {
      return null;
    }
    return {
      previousPriceMonthly:
        typeof p.previousPriceMonthly === 'number'
          ? p.previousPriceMonthly
          : p.previousPriceMonthly == null
            ? null
            : Number(p.previousPriceMonthly),
      priceMonthly:
        typeof p.priceMonthly === 'number'
          ? p.priceMonthly
          : p.priceMonthly == null
            ? null
            : Number(p.priceMonthly),
      previousPriceYearly:
        typeof p.previousPriceYearly === 'number'
          ? p.previousPriceYearly
          : p.previousPriceYearly == null
            ? null
            : Number(p.previousPriceYearly),
      priceYearly:
        typeof p.priceYearly === 'number'
          ? p.priceYearly
          : p.priceYearly == null
            ? null
            : Number(p.priceYearly),
    };
  }
}

function formatCampaignMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `$${Number(value).toFixed(2)}`;
}
