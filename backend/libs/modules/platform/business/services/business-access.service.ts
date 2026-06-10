import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BusinessCapabilityAssignmentStatus,
  BusinessCapabilitySource,
  BusinessStatus,
  BusinessSubscriptionBillingCycle,
  PlanTierStatus,
  Prisma,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { AuditService } from '@app/modules/platform/audit/services/audit.service';
import { SnapshotApplyService } from '@app/modules/platform/snapshots/services/snapshot-apply.service';
import { SnapshotsService } from '@app/modules/platform/snapshots/services/snapshots.service';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  BusinessAccessCreateFieldsDto,
  BusinessAccessDto,
  BusinessCapabilityDto,
  BusinessAccessSubscriptionDto,
  UpdateBusinessAccessDto,
  UpdateBusinessCapabilitiesDto,
} from '../dto/business-access.dto';
import { BusinessTenantAccessDto } from '../dto/business-tenant-access.dto';
import { BusinessCapabilityRepository } from '../repositories/business-capability.repository';
import { BusinessRepository } from '../repositories/business.repository';
import { BusinessAccessResolverService } from './business-access-resolver.service';
import { BusinessCapabilitySyncService } from './business-capability-sync.service';
import { BusinessEffectiveCapabilitiesService } from './business-effective-capabilities.service';
import { BusinessSubscriptionActionAvailabilityService } from './business-subscription-action-availability.service';
import { SubscriptionActionDefinition } from '../types/subscription-action.types';
import { calculateSubscriptionPeriod } from '../utils/calculate-subscription-period.util';
import { resolveTierPrice } from '../utils/resolve-tier-price.util';
import {
  assertBillingCycleRequired,
  assertCustomPeriodEndRequired,
  assertTierPriceOrCustomAmount,
} from '../utils/subscription-billing-validation.util';

const subscriptionInclude = {
  planGroup: { select: { id: true, name: true, currency: true } },
  planTier: {
    select: {
      id: true,
      name: true,
      priceMonthly: true,
      priceYearly: true,
      setupFee: true,
      trialDays: true,
    },
  },
} satisfies Prisma.BusinessSubscriptionInclude;

type SubscriptionWithRelations = Prisma.BusinessSubscriptionGetPayload<{
  include: typeof subscriptionInclude;
}>;

@Injectable()
export class BusinessAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessRepository: BusinessRepository,
    private readonly businessCapabilityRepository: BusinessCapabilityRepository,
    private readonly capabilitySyncService: BusinessCapabilitySyncService,
    private readonly snapshotsService: SnapshotsService,
    private readonly snapshotApplyService: SnapshotApplyService,
    private readonly accessResolver: BusinessAccessResolverService,
    private readonly effectiveCapabilitiesService: BusinessEffectiveCapabilitiesService,
    private readonly auditService: AuditService,
    private readonly actionAvailability: BusinessSubscriptionActionAvailabilityService,
  ) {}

  async getCurrentAccess(businessId: string): Promise<BusinessTenantAccessDto> {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const [subscription, effectiveCapabilities, resolution] = await Promise.all([
      this.prisma.businessSubscription.findUnique({
        where: { businessId },
        include: subscriptionInclude,
      }),
      this.effectiveCapabilitiesService.resolveEffectiveCapabilities(businessId),
      this.accessResolver.resolveForBusiness(businessId),
    ]);

    return {
      businessId: business.id,
      businessName: business.name,
      businessStatus: business.status,
      canAccessWorkspace: resolution.canAccessWorkspace,
      reasonCode: resolution.reasonCode,
      reasonLabel: resolution.reasonLabel,
      warnings: resolution.warnings,
      needsAttention: resolution.needsAttention,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            planGroupId: subscription.planGroupId,
            planGroupName: subscription.planGroup?.name ?? null,
            planTierId: subscription.planTierId,
            planTierName: subscription.planTier?.name ?? null,
            paymentMethod: subscription.paymentMethod,
            paymentStatus: subscription.paymentStatus,
            billingCycle: subscription.billingCycle,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            amount: subscription.amount?.toString() ?? null,
            currency: subscription.currency,
          }
        : null,
      effectiveCapabilities: effectiveCapabilities.map((cap) => ({
        id: cap.key,
        key: cap.key,
        name: cap.name,
        description: null,
      })),
    };
  }

  async getAccess(businessId: string): Promise<
    BusinessAccessDto & {
      availableActions: SubscriptionActionDefinition[];
      recommendedAction: SubscriptionActionDefinition | null;
    }
  > {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const [subscription, capabilities, resolution, actions] = await Promise.all([
      this.prisma.businessSubscription.findUnique({
        where: { businessId },
        include: subscriptionInclude,
      }),
      this.businessCapabilityRepository.findByBusinessId(businessId),
      this.accessResolver.resolveForBusiness(businessId),
      this.actionAvailability.resolveAvailableActions(businessId),
    ]);

    return {
      businessId: business.id,
      businessStatus: business.status,
      snapshotId: business.snapshotId,
      snapshotName: business.snapshot?.name ?? null,
      snapshotAppliedAt: business.snapshotAppliedAt,
      subscription: subscription ? this.toSubscriptionDto(subscription) : null,
      capabilities: capabilities.map(this.toCapabilityDto),
      resolution,
      availableActions: actions.availableActions,
      recommendedAction: actions.recommendedAction,
    };
  }

  async updateAccessInternal(
    tx: Prisma.TransactionClient | PrismaService,
    businessId: string,
    dto: UpdateBusinessAccessDto,
    actor: RequestUser,
    options?: { skipAudit?: boolean },
  ): Promise<void> {
    const business = await tx.business.findFirst({
      where: { id: businessId, deletedAt: null },
    });
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.validateAccessUpdate(dto, businessId);

    const existingSubscription = await tx.businessSubscription.findUnique({
      where: { businessId },
    });

    if (dto.snapshotId) {
      const snapshot = await this.snapshotsService.resolveForBusiness(
        dto.snapshotId,
      );
      if (!snapshot || snapshot.id !== dto.snapshotId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Invalid or unpublished snapshot',
          HttpStatus.BAD_REQUEST,
        );
      }
      await tx.business.update({
        where: { id: businessId },
        data: { snapshot: { connect: { id: snapshot.id } } },
      });
    }

    if (dto.businessStatus) {
      await tx.business.update({
        where: { id: businessId },
        data: { status: dto.businessStatus },
      });
    }

    const subscriptionData = await this.buildSubscriptionUpsertData(
      businessId,
      dto,
    );

    if (subscriptionData) {
      await tx.businessSubscription.upsert({
        where: { businessId },
        create: subscriptionData.create,
        update: subscriptionData.update,
      });
    }

    const tierChanged =
      dto.planTierId !== undefined &&
      dto.planTierId !== null &&
      dto.planTierId !== existingSubscription?.planTierId;

    const shouldSyncCapabilities =
      Boolean(dto.planTierId) &&
      (dto.syncCapabilitiesFromTier === true ||
        (dto.syncCapabilitiesFromTier !== false && tierChanged));

    if (shouldSyncCapabilities && dto.planTierId) {
      await this.capabilitySyncService.syncFromPlanTier(
        businessId,
        dto.planTierId,
      );
    }

    if (dto.applySnapshot && dto.snapshotId) {
      await this.snapshotApplyService.apply(
        businessId,
        dto.snapshotId,
        actor.id,
      );
    }

    if (!options?.skipAudit) {
      await this.auditService.log({
        actorUserId: actor.id,
        businessId,
        action: 'platform.business.access.updated',
        entityType: 'Business',
        entityId: businessId,
        metadata: { ...dto },
      });
    }
  }

  async createAccessForBusiness(
    businessId: string,
    dto: BusinessAccessCreateFieldsDto,
    actor: RequestUser,
  ): Promise<BusinessAccessDto> {
    const updateDto: UpdateBusinessAccessDto = {
      businessStatus: dto.status,
      planGroupId: dto.planGroupId,
      planTierId: dto.planTierId,
      subscriptionStatus: dto.subscriptionStatus,
      paymentMethod: dto.paymentMethod,
      paymentStatus: dto.paymentStatus,
      billingCycle: dto.billingCycle,
      currentPeriodStart: dto.currentPeriodStart,
      currentPeriodEnd: dto.currentPeriodEnd,
      amount: dto.amount,
      currency: dto.currency,
      notes: dto.notes,
      syncCapabilitiesFromTier: dto.syncCapabilitiesFromTier ?? Boolean(dto.planTierId),
    };

    await this.updateAccessInternal(this.prisma, businessId, updateDto, actor);
    return this.getAccess(businessId);
  }

  async listCapabilities(businessId: string): Promise<BusinessCapabilityDto[]> {
    await this.ensureBusinessExists(businessId);
    const rows =
      await this.businessCapabilityRepository.findByBusinessId(businessId);
    return rows.map(this.toCapabilityDto);
  }

  async updateCapabilities(
    businessId: string,
    dto: UpdateBusinessCapabilitiesDto,
    actor: RequestUser,
  ): Promise<BusinessCapabilityDto[]> {
    await this.ensureBusinessExists(businessId);

    for (const item of dto.capabilities) {
      const capability = await this.prisma.capability.findFirst({
        where: { id: item.capabilityId, deletedAt: null },
      });
      if (!capability) {
        throw new AppException(
          ErrorCode.NOT_FOUND,
          `Capability not found: ${item.capabilityId}`,
          HttpStatus.NOT_FOUND,
        );
      }

      const source =
        item.source ??
        BusinessCapabilitySource.CUSTOM;

      if (
        source === BusinessCapabilitySource.PLAN_TIER &&
        item.status === BusinessCapabilityAssignmentStatus.DISABLED
      ) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Plan tier capabilities cannot be disabled directly. Remove from tier or use custom override.',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.businessCapabilityRepository.upsert({
        businessId,
        capabilityId: item.capabilityId,
        source,
        status: item.status ?? BusinessCapabilityAssignmentStatus.ACTIVE,
      });
    }

    await this.auditService.log({
      actorUserId: actor.id,
      businessId,
      action: 'platform.business.capabilities.updated',
      entityType: 'Business',
      entityId: businessId,
      metadata: { count: dto.capabilities.length },
    });

    return this.listCapabilities(businessId);
  }

  private async validateAccessUpdate(
    dto: UpdateBusinessAccessDto,
    businessId?: string,
  ): Promise<void> {
    if (dto.subscriptionStatus === SubscriptionStatus.TRIALING) {
      if (dto.currentPeriodEnd === null) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Period end date is required for trialing subscriptions',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (dto.currentPeriodEnd === undefined && businessId) {
        const existing = await this.prisma.businessSubscription.findUnique({
          where: { businessId },
        });
        if (!existing?.currentPeriodEnd) {
          throw new AppException(
            ErrorCode.BAD_REQUEST,
            'Period end date is required for trialing subscriptions',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    }

    if (dto.planTierId) {
      const tier = await this.prisma.planTier.findFirst({
        where: {
          id: dto.planTierId,
          deletedAt: null,
          status: PlanTierStatus.PUBLISHED,
        },
      });
      if (!tier) {
        throw new AppException(
          ErrorCode.NOT_FOUND,
          'Active plan tier not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const groupId = dto.planGroupId ?? tier.planGroupId;
      if (tier.planGroupId !== groupId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Plan tier does not belong to the selected plan group',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (dto.planGroupId && !dto.planTierId) {
      const group = await this.prisma.planGroup.findFirst({
        where: { id: dto.planGroupId, deletedAt: null },
      });
      if (!group) {
        throw new AppException(
          ErrorCode.NOT_FOUND,
          'Plan group not found',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    if (dto.subscriptionStatus === SubscriptionStatus.INTERNAL) {
      if (
        dto.paymentMethod &&
        dto.paymentMethod !== SubscriptionPaymentMethod.FREE_INTERNAL
      ) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Internal subscriptions should use FREE_INTERNAL payment method',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (
        dto.paymentStatus &&
        dto.paymentStatus !== SubscriptionPaymentStatus.NOT_REQUIRED
      ) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Internal subscriptions should use NOT_REQUIRED payment status',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (dto.subscriptionStatus === SubscriptionStatus.PENDING_PAYMENT) {
      if (
        dto.paymentStatus &&
        dto.paymentStatus !== SubscriptionPaymentStatus.PENDING
      ) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Pending payment subscriptions should use PENDING payment status',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const touchesSubscription =
      dto.subscriptionStatus !== undefined ||
      dto.planTierId !== undefined ||
      dto.billingCycle !== undefined ||
      dto.amount !== undefined ||
      dto.currentPeriodEnd !== undefined;

    if (!touchesSubscription) {
      return;
    }

    const existing = businessId
      ? await this.prisma.businessSubscription.findUnique({
          where: { businessId },
          include: {
            planTier: {
              select: {
                priceMonthly: true,
                priceYearly: true,
                setupFee: true,
              },
            },
          },
        })
      : null;

    const status =
      dto.subscriptionStatus ?? existing?.status ?? SubscriptionStatus.TRIALING;
    const billingCycle =
      dto.billingCycle !== undefined
        ? dto.billingCycle
        : existing?.billingCycle ??
          (!existing &&
          status !== SubscriptionStatus.INTERNAL &&
          (status === SubscriptionStatus.ACTIVE ||
            status === SubscriptionStatus.TRIALING)
            ? BusinessSubscriptionBillingCycle.MONTHLY
            : undefined);

    assertBillingCycleRequired(status, billingCycle);

    if (billingCycle) {
      assertCustomPeriodEndRequired(
        billingCycle,
        dto.currentPeriodEnd ?? existing?.currentPeriodEnd,
      );

      let tier = existing?.planTier ?? null;
      if (dto.planTierId) {
        tier = await this.prisma.planTier.findFirst({
          where: { id: dto.planTierId, deletedAt: null },
          select: {
            priceMonthly: true,
            priceYearly: true,
            setupFee: true,
          },
        });
      }

      if (
        status !== SubscriptionStatus.INTERNAL &&
        (dto.amount !== undefined || dto.planTierId !== undefined)
      ) {
        assertTierPriceOrCustomAmount({
          billingCycle,
          tier,
          amount: dto.amount ?? (existing?.amount ? Number(existing.amount) : null),
          currency: dto.currency ?? existing?.currency,
          customPrice: dto.amount !== undefined,
        });
      }
    }
  }

  private async buildSubscriptionUpsertData(
    businessId: string,
    dto: UpdateBusinessAccessDto,
  ): Promise<{
    create: Prisma.BusinessSubscriptionUncheckedCreateInput;
    update: Prisma.BusinessSubscriptionUpdateInput;
  } | null> {
    const hasSubscriptionFields =
      dto.subscriptionStatus !== undefined ||
      dto.planGroupId !== undefined ||
      dto.planTierId !== undefined ||
      dto.paymentMethod !== undefined ||
      dto.paymentStatus !== undefined ||
      dto.billingCycle !== undefined ||
      dto.currentPeriodStart !== undefined ||
      dto.currentPeriodEnd !== undefined ||
      dto.amount !== undefined ||
      dto.currency !== undefined ||
      dto.notes !== undefined;

    if (!hasSubscriptionFields) {
      return null;
    }

    const existing = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    const status = dto.subscriptionStatus ?? existing?.status ?? SubscriptionStatus.TRIALING;

    if (status === SubscriptionStatus.TRIALING) {
      const periodEnd = dto.currentPeriodEnd !== undefined
        ? this.parseDate(dto.currentPeriodEnd)
        : existing?.currentPeriodEnd;
      if (!periodEnd) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Period end date is required for trialing subscriptions',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const paymentMethod =
      dto.paymentMethod ??
      (status === SubscriptionStatus.INTERNAL
        ? SubscriptionPaymentMethod.FREE_INTERNAL
        : existing?.paymentMethod ?? SubscriptionPaymentMethod.NOT_SELECTED);

    const isCreate = !existing;
    const statusChanging =
      dto.subscriptionStatus !== undefined &&
      dto.subscriptionStatus !== existing?.status;

    let paymentStatus: SubscriptionPaymentStatus;
    if (dto.paymentStatus !== undefined) {
      paymentStatus = dto.paymentStatus;
    } else if (isCreate) {
      paymentStatus =
        status === SubscriptionStatus.INTERNAL
          ? SubscriptionPaymentStatus.NOT_REQUIRED
          : status === SubscriptionStatus.PENDING_PAYMENT
            ? SubscriptionPaymentStatus.PENDING
            : status === SubscriptionStatus.ACTIVE
              ? SubscriptionPaymentStatus.PAID
              : SubscriptionPaymentStatus.NOT_REQUIRED;
    } else if (statusChanging) {
      paymentStatus = existing!.paymentStatus;
    } else {
      paymentStatus = existing!.paymentStatus;
    }

    const base: Prisma.BusinessSubscriptionUncheckedCreateInput = {
      businessId,
      status,
      paymentMethod,
      paymentStatus,
    };

    if (dto.planGroupId !== undefined) {
      base.planGroupId = dto.planGroupId;
    }
    if (dto.planTierId !== undefined) {
      base.planTierId = dto.planTierId;
    }
    if (dto.billingCycle !== undefined) {
      base.billingCycle = dto.billingCycle;
    } else if (isCreate && status !== SubscriptionStatus.INTERNAL) {
      base.billingCycle = BusinessSubscriptionBillingCycle.MONTHLY;
    }
    if (dto.currentPeriodStart !== undefined) {
      base.currentPeriodStart = this.parseDate(dto.currentPeriodStart);
    }
    if (dto.currentPeriodEnd !== undefined) {
      base.currentPeriodEnd = this.parseDate(dto.currentPeriodEnd);
    }
    if (dto.amount !== undefined) {
      base.amount = dto.amount;
    }
    if (dto.currency !== undefined) {
      base.currency = dto.currency;
    }
    if (dto.notes !== undefined) {
      base.notes = dto.notes;
    }

    if (status === SubscriptionStatus.CANCELED) {
      base.canceledAt = new Date();
    }

    const update: Prisma.BusinessSubscriptionUpdateInput = {
      ...(dto.subscriptionStatus !== undefined ? { status: dto.subscriptionStatus } : {}),
      ...(dto.paymentMethod !== undefined ? { paymentMethod: dto.paymentMethod } : {}),
      ...(dto.paymentStatus !== undefined ? { paymentStatus: dto.paymentStatus } : {}),
      ...(dto.billingCycle !== undefined ? { billingCycle: dto.billingCycle } : {}),
      ...(dto.planGroupId !== undefined
        ? dto.planGroupId
          ? { planGroup: { connect: { id: dto.planGroupId } } }
          : { planGroup: { disconnect: true } }
        : {}),
      ...(dto.planTierId !== undefined
        ? dto.planTierId
          ? { planTier: { connect: { id: dto.planTierId } } }
          : { planTier: { disconnect: true } }
        : {}),
      ...(dto.currentPeriodStart !== undefined
        ? { currentPeriodStart: this.parseDate(dto.currentPeriodStart) }
        : {}),
      ...(dto.currentPeriodEnd !== undefined
        ? { currentPeriodEnd: this.parseDate(dto.currentPeriodEnd) }
        : {}),
      ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.subscriptionStatus === SubscriptionStatus.CANCELED
        ? { canceledAt: new Date() }
        : {}),
    };

    return { create: base, update };
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return new Date(value);
  }

  private async ensureBusinessExists(businessId: string): Promise<void> {
    const business = await this.businessRepository.findById(businessId);
    if (!business) {
      throw new AppException(
        ErrorCode.BUSINESS_NOT_FOUND,
        'Business not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private toSubscriptionDto(
    sub: SubscriptionWithRelations,
  ): BusinessAccessSubscriptionDto {
    const amount = sub.amount?.toString() ?? null;
    const suggested = this.computeSuggestedAmount(sub);
    const period = calculateSubscriptionPeriod({
      billingCycle: sub.billingCycle,
      startDate: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialDays: sub.planTier?.trialDays,
      subscriptionStatus: sub.status,
    });

    return {
      id: sub.id,
      status: sub.status,
      planGroupId: sub.planGroupId,
      planGroupName: sub.planGroup?.name ?? null,
      planTierId: sub.planTierId,
      planTierName: sub.planTier?.name ?? null,
      paymentMethod: sub.paymentMethod,
      paymentStatus: sub.paymentStatus,
      billingCycle: sub.billingCycle,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      amount,
      currency: sub.currency,
      suggestedAmount: amount == null ? suggested.amount : undefined,
      suggestedCurrency: amount == null ? suggested.currency : undefined,
      nextBillingDate: period.nextBillingDate,
      nextBillingLabel: period.nextBillingLabel,
      notes: sub.notes,
      canceledAt: sub.canceledAt,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    };
  }

  private computeSuggestedAmount(sub: SubscriptionWithRelations): {
    amount: string | null;
    currency: string | null;
  } {
    if (!sub.planTierId) {
      return { amount: null, currency: sub.currency ?? null };
    }

    const billingCycle =
      sub.billingCycle ?? BusinessSubscriptionBillingCycle.MONTHLY;
    const currency =
      sub.currency ?? sub.planGroup?.currency ?? 'USD';
    const resolved = resolveTierPrice(sub.planTier, billingCycle, { currency });

    return {
      amount: resolved.amount != null ? resolved.amount.toString() : null,
      currency: resolved.currency ?? currency,
    };
  }

  private toCapabilityDto(row: {
    id: string;
    capabilityId: string;
    source: BusinessCapabilitySource;
    status: BusinessCapabilityAssignmentStatus;
    createdAt: Date;
    updatedAt: Date;
    capability: {
      key: string;
      name: string;
      description: string | null;
    };
  }): BusinessCapabilityDto {
    return {
      id: row.id,
      capabilityId: row.capabilityId,
      key: row.capability.key,
      name: row.capability.name,
      description: row.capability.description,
      source: row.source,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
