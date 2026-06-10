import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BusinessStatus,
  BusinessSubscriptionBillingCycle,
  BusinessSubscriptionEventSource,
  BusinessSubscriptionEventType,
  BusinessSubscriptionPaymentType,
  Prisma,
  SubscriptionPaymentMethod,
  SubscriptionPaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import { BusinessAccessDto, ExtendTrialDto, UpdateBusinessAccessDto } from '../dto/business-access.dto';
import {
  ChangePackageActionDto,
  ChangeSnapshotActionDto,
  MarkPaidDto,
  PreviewActionDto,
  PreviewActionResultDto,
  ReactivateBusinessDto,
} from '../dto/business-subscription-action.dto';
import {
  RecordPaymentDto,
  RefundPaymentDto,
} from '../dto/business-subscription-payment.dto';
import type { SubscriptionActionKey } from '../types/subscription-action.types';
import type { SubscriptionStateSnapshot } from '../types/subscription-state-snapshot.types';
import { BusinessAccessResolverService } from './business-access-resolver.service';
import { BusinessAccessService } from './business-access.service';
import { BusinessCapabilitySyncService } from './business-capability-sync.service';
import { BusinessSubscriptionActionAvailabilityService } from './business-subscription-action-availability.service';
import { BusinessSubscriptionEventService } from './business-subscription-event.service';
import { BusinessSubscriptionPaymentService } from './business-subscription-payment.service';
import { calculateSubscriptionPeriod } from '../utils/calculate-subscription-period.util';
import { resolveTierPrice } from '../utils/resolve-tier-price.util';
import {
  normalizeMonthlyPrice,
  resolvePlanChangeEventType,
} from '../utils/subscription-plan-change.util';
import {
  assertCustomPeriodEndRequired,
  assertTierPriceOrCustomAmount,
} from '../utils/subscription-billing-validation.util';

type ActionResult = BusinessAccessDto & { correlationId?: string };

@Injectable()
export class BusinessSubscriptionActionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: BusinessAccessService,
    private readonly accessResolver: BusinessAccessResolverService,
    private readonly eventService: BusinessSubscriptionEventService,
    private readonly paymentService: BusinessSubscriptionPaymentService,
    private readonly availabilityService: BusinessSubscriptionActionAvailabilityService,
    private readonly capabilitySyncService: BusinessCapabilitySyncService,
  ) {}

  async previewAction(
    businessId: string,
    dto: PreviewActionDto,
  ): Promise<PreviewActionResultDto> {
    const actionKey = dto.actionKey as SubscriptionActionKey;
    const beforeState = await this.eventService.captureState(businessId);
    const action = this.availabilityService.resolveAction(actionKey, beforeState);

    if (!action.visible || !action.enabled) {
      return {
        actionKey,
        allowed: false,
        reason: action.disabledReason ?? 'Action not available',
        beforeState,
        afterState: beforeState,
        accessImpact: this.buildAccessImpact(beforeState, beforeState),
        warnings: [],
        requiresConfirmation: action.requiresConfirmation,
      };
    }

    const afterState = await this.computeAfterState(
      businessId,
      actionKey,
      dto.input,
      beforeState,
    );
    const warnings = this.buildWarnings(actionKey, beforeState, afterState);

    return {
      actionKey,
      allowed: true,
      beforeState,
      afterState,
      accessImpact: this.buildAccessImpact(beforeState, afterState),
      paymentImpact: this.buildPaymentImpact(actionKey, dto.input),
      warnings,
      requiresConfirmation: action.requiresConfirmation,
    };
  }

  async markPaid(
    businessId: string,
    dto: MarkPaidDto,
    actor: RequestUser,
  ): Promise<ActionResult> {
    if (dto.skipPaymentRecord) {
      if (!dto.reason?.trim() || !dto.notes?.trim()) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Reason and notes are required when skipping payment record',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const subscription = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
      include: {
        planGroup: { select: { currency: true } },
      },
    });

    const amount =
      dto.amount ??
      (subscription?.amount != null ? Number(subscription.amount) : undefined);
    const currency =
      dto.currency ??
      subscription?.currency ??
      subscription?.planGroup?.currency ??
      'USD';
    const billingCycle =
      subscription?.billingCycle ?? BusinessSubscriptionBillingCycle.MONTHLY;

    if (!dto.skipPaymentRecord && (amount == null || !currency)) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Amount and currency are required to create a payment record',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.executeAction(businessId, 'MARK_PAID', actor, async (tx, correlationId, before) => {
      const update: UpdateBusinessAccessDto = {
        businessStatus: BusinessStatus.ACTIVE,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        paymentStatus: SubscriptionPaymentStatus.PAID,
        paymentMethod: dto.paymentMethod ?? SubscriptionPaymentMethod.MANUAL_INVOICE,
      };

      await this.accessService.updateAccessInternal(tx, businessId, update, actor, {
        skipAudit: true,
      });

      let paymentId: string | null = null;
      if (!dto.skipPaymentRecord && amount != null) {
        const payment = await this.paymentService.recordPayment(
          tx,
          businessId,
          {
            amount,
            currency,
            paymentMethod: dto.paymentMethod ?? SubscriptionPaymentMethod.MANUAL_INVOICE,
            paymentStatus: SubscriptionPaymentStatus.PAID,
            paymentType: BusinessSubscriptionPaymentType.SUBSCRIPTION,
            billingCycle,
            periodStart:
              dto.periodStart ??
              subscription?.currentPeriodStart?.toISOString().slice(0, 10),
            periodEnd:
              dto.periodEnd ??
              subscription?.currentPeriodEnd?.toISOString().slice(0, 10),
            paidAt: dto.paidAt ?? new Date().toISOString(),
            paymentReference: dto.paymentReference,
            notes: dto.notes,
          },
          actor,
        );
        paymentId = payment.id;
      }

      const after = await this.eventService.captureState(businessId, tx);
      const sub = await tx.businessSubscription.findUnique({ where: { businessId } });

      await this.eventService.createCorrelatedEvents(
        tx,
        correlationId,
        [
          {
            businessId,
            subscriptionId: sub?.id,
            eventType: BusinessSubscriptionEventType.PAYMENT_MARKED_PAID,
            actionKey: 'MARK_PAID',
            paymentId,
            fromState: before as unknown as Prisma.InputJsonValue,
            toState: after as unknown as Prisma.InputJsonValue,
            reason: dto.reason,
            notes: dto.notes,
          },
          {
            businessId,
            subscriptionId: sub?.id,
            eventType: BusinessSubscriptionEventType.STATUS_CHANGED,
            actionKey: 'MARK_PAID',
            fromState: before as unknown as Prisma.InputJsonValue,
            toState: after as unknown as Prisma.InputJsonValue,
          },
        ],
        actor,
      );
    });
  }

  async recordPayment(
    businessId: string,
    dto: RecordPaymentDto,
    actor: RequestUser,
  ): Promise<ActionResult> {
    return this.executeAction(businessId, 'RECORD_PAYMENT', actor, async (tx, correlationId, before) => {
      const payment = await this.paymentService.recordPayment(tx, businessId, dto, actor);

      if (dto.activateSubscription) {
        await this.accessService.updateAccessInternal(
          tx,
          businessId,
          {
            businessStatus: BusinessStatus.ACTIVE,
            subscriptionStatus: SubscriptionStatus.ACTIVE,
            paymentStatus: SubscriptionPaymentStatus.PAID,
            paymentMethod: dto.paymentMethod,
          },
          actor,
          { skipAudit: true },
        );
      }

      const after = await this.eventService.captureState(businessId, tx);
      const sub = await tx.businessSubscription.findUnique({ where: { businessId } });
      const eventType =
        dto.paymentStatus === SubscriptionPaymentStatus.PARTIALLY_PAID
          ? BusinessSubscriptionEventType.PARTIAL_PAYMENT_RECORDED
          : BusinessSubscriptionEventType.PAYMENT_MARKED_PAID;

      await this.eventService.createEvent(
        tx,
        {
          businessId,
          subscriptionId: sub?.id,
          eventType,
          actionKey: 'RECORD_PAYMENT',
          paymentId: payment.id,
          correlationId,
          fromState: before as unknown as Prisma.InputJsonValue,
          toState: after as unknown as Prisma.InputJsonValue,
          notes: dto.notes,
        },
        actor,
      );
    });
  }

  async moveToPendingPayment(
    businessId: string,
    actor: RequestUser,
    reason?: string,
  ): Promise<ActionResult> {
    return this.executeAction(businessId, 'MOVE_PENDING', actor, async (tx, correlationId, before) => {
      const sub = await tx.businessSubscription.findUnique({ where: { businessId } });
      if (sub?.status === SubscriptionStatus.PENDING_PAYMENT) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Already pending payment',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.accessService.updateAccessInternal(
        tx,
        businessId,
        {
          businessStatus: BusinessStatus.NOT_ACTIVE,
          subscriptionStatus: SubscriptionStatus.PENDING_PAYMENT,
          paymentMethod: SubscriptionPaymentMethod.MANUAL_INVOICE,
          paymentStatus: SubscriptionPaymentStatus.PENDING,
        },
        actor,
        { skipAudit: true },
      );

      const after = await this.eventService.captureState(businessId, tx);
      const subscription = await tx.businessSubscription.findUnique({ where: { businessId } });

      await this.eventService.createCorrelatedEvents(
        tx,
        correlationId,
        [
          {
            businessId,
            subscriptionId: subscription?.id,
            eventType: BusinessSubscriptionEventType.PAYMENT_PENDING,
            actionKey: 'MOVE_PENDING',
            fromState: before as unknown as Prisma.InputJsonValue,
            toState: after as unknown as Prisma.InputJsonValue,
            reason,
          },
          {
            businessId,
            subscriptionId: subscription?.id,
            eventType: BusinessSubscriptionEventType.STATUS_CHANGED,
            actionKey: 'MOVE_PENDING',
            fromState: before as unknown as Prisma.InputJsonValue,
            toState: after as unknown as Prisma.InputJsonValue,
          },
        ],
        actor,
      );
    });
  }

  async extendTrial(
    businessId: string,
    dto: ExtendTrialDto,
    actor: RequestUser,
  ): Promise<ActionResult> {
    return this.executeAction(businessId, 'EXTEND_TRIAL', actor, async (tx, correlationId, before) => {
      const subscription = await tx.businessSubscription.findUnique({
        where: { businessId },
      });

      let periodEnd: Date;
      if (dto.currentPeriodEnd) {
        periodEnd = new Date(dto.currentPeriodEnd);
      } else {
        const days = dto.days ?? 14;
        const base = subscription?.currentPeriodEnd ?? new Date();
        periodEnd = new Date(base);
        periodEnd.setDate(periodEnd.getDate() + days);
      }

      const update: UpdateBusinessAccessDto = {
        businessStatus: BusinessStatus.ACTIVE,
        subscriptionStatus: SubscriptionStatus.TRIALING,
        paymentMethod: SubscriptionPaymentMethod.NOT_SELECTED,
        paymentStatus: SubscriptionPaymentStatus.NOT_REQUIRED,
        currentPeriodEnd: periodEnd.toISOString().slice(0, 10),
      };

      if (!subscription?.currentPeriodStart) {
        update.currentPeriodStart = new Date().toISOString().slice(0, 10);
      }

      await this.accessService.updateAccessInternal(
        tx,
        businessId,
        update,
        actor,
        { skipAudit: true },
      );

      const after = await this.eventService.captureState(businessId, tx);
      const sub = await tx.businessSubscription.findUnique({ where: { businessId } });

      await this.eventService.createEvent(
        tx,
        {
          businessId,
          subscriptionId: sub?.id,
          eventType: BusinessSubscriptionEventType.TRIAL_EXTENDED,
          actionKey: 'EXTEND_TRIAL',
          correlationId,
          fromState: before as unknown as Prisma.InputJsonValue,
          toState: after as unknown as Prisma.InputJsonValue,
        },
        actor,
      );
    });
  }

  async cancelSubscription(
    businessId: string,
    actor: RequestUser,
    reason?: string,
  ): Promise<ActionResult> {
    return this.executeAction(businessId, 'CANCEL_SUBSCRIPTION', actor, async (tx, correlationId, before) => {
      const sub = await tx.businessSubscription.findUnique({ where: { businessId } });
      if (sub?.status === SubscriptionStatus.CANCELED) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Subscription is already canceled',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.accessService.updateAccessInternal(
        tx,
        businessId,
        {
          businessStatus: BusinessStatus.NOT_ACTIVE,
          subscriptionStatus: SubscriptionStatus.CANCELED,
        },
        actor,
        { skipAudit: true },
      );

      const after = await this.eventService.captureState(businessId, tx);
      const subscription = await tx.businessSubscription.findUnique({ where: { businessId } });

      await this.eventService.createEvent(
        tx,
        {
          businessId,
          subscriptionId: subscription?.id,
          eventType: BusinessSubscriptionEventType.CANCELED,
          actionKey: 'CANCEL_SUBSCRIPTION',
          correlationId,
          fromState: before as unknown as Prisma.InputJsonValue,
          toState: after as unknown as Prisma.InputJsonValue,
          reason,
        },
        actor,
      );
    });
  }

  async expireTrial(businessId: string, actor: RequestUser): Promise<ActionResult> {
    return this.executeAction(businessId, 'EXPIRE_TRIAL', actor, async (tx, correlationId, before) => {
      const sub = await tx.businessSubscription.findUnique({ where: { businessId } });
      if (sub?.status === SubscriptionStatus.EXPIRED) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Subscription is already expired',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.accessService.updateAccessInternal(
        tx,
        businessId,
        {
          businessStatus: BusinessStatus.NOT_ACTIVE,
          subscriptionStatus: SubscriptionStatus.EXPIRED,
        },
        actor,
        { skipAudit: true },
      );

      const after = await this.eventService.captureState(businessId, tx);
      const subscription = await tx.businessSubscription.findUnique({ where: { businessId } });
      const eventType =
        before.subscriptionStatus === SubscriptionStatus.TRIALING
          ? BusinessSubscriptionEventType.TRIAL_EXPIRED
          : BusinessSubscriptionEventType.EXPIRED;

      await this.eventService.createEvent(
        tx,
        {
          businessId,
          subscriptionId: subscription?.id,
          eventType,
          actionKey: 'EXPIRE_TRIAL',
          correlationId,
          fromState: before as unknown as Prisma.InputJsonValue,
          toState: after as unknown as Prisma.InputJsonValue,
        },
        actor,
      );
    });
  }

  async suspendBusiness(
    businessId: string,
    actor: RequestUser,
    reason?: string,
  ): Promise<ActionResult> {
    return this.executeAction(businessId, 'SUSPEND_BUSINESS', actor, async (tx, correlationId, before) => {
      const business = await tx.business.findUnique({ where: { id: businessId } });
      if (business?.status === BusinessStatus.SUSPENDED) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Business is already suspended',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.accessService.updateAccessInternal(
        tx,
        businessId,
        { businessStatus: BusinessStatus.SUSPENDED },
        actor,
        { skipAudit: true },
      );

      const after = await this.eventService.captureState(businessId, tx);
      const sub = await tx.businessSubscription.findUnique({ where: { businessId } });

      await this.eventService.createEvent(
        tx,
        {
          businessId,
          subscriptionId: sub?.id,
          eventType: BusinessSubscriptionEventType.SUSPENDED,
          actionKey: 'SUSPEND_BUSINESS',
          correlationId,
          fromState: before as unknown as Prisma.InputJsonValue,
          toState: after as unknown as Prisma.InputJsonValue,
          reason,
        },
        actor,
      );
    });
  }

  async reactivateBusiness(
    businessId: string,
    dto: ReactivateBusinessDto,
    actor: RequestUser,
  ): Promise<ActionResult> {
    return this.executeAction(businessId, 'REACTIVATE_BUSINESS', actor, async (tx, correlationId, before) => {
      const update: UpdateBusinessAccessDto = {
        businessStatus: BusinessStatus.ACTIVE,
      };

      if (dto.mode === 'restore_paid') {
        update.subscriptionStatus = SubscriptionStatus.ACTIVE;
        update.paymentStatus = SubscriptionPaymentStatus.PAID;
      } else if (dto.mode === 'restore_trial') {
        update.subscriptionStatus = SubscriptionStatus.TRIALING;
        update.paymentStatus = SubscriptionPaymentStatus.NOT_REQUIRED;
        update.paymentMethod = SubscriptionPaymentMethod.NOT_SELECTED;
        if (dto.currentPeriodEnd) update.currentPeriodEnd = dto.currentPeriodEnd;
      } else if (dto.mode === 'restore_internal') {
        update.subscriptionStatus = SubscriptionStatus.INTERNAL;
        update.paymentMethod = SubscriptionPaymentMethod.FREE_INTERNAL;
        update.paymentStatus = SubscriptionPaymentStatus.NOT_REQUIRED;
      }

      await this.accessService.updateAccessInternal(tx, businessId, update, actor, {
        skipAudit: true,
      });

      let paymentId: string | null = null;
      if (dto.payment) {
        const payment = await this.paymentService.recordPayment(
          tx,
          businessId,
          dto.payment,
          actor,
        );
        paymentId = payment.id;
      }

      const after = await this.eventService.captureState(businessId, tx);
      const sub = await tx.businessSubscription.findUnique({ where: { businessId } });

      const events: Array<{
        businessId: string;
        subscriptionId?: string | null;
        eventType: BusinessSubscriptionEventType;
        actionKey: string;
        paymentId?: string | null;
        fromState: Prisma.InputJsonValue;
        toState: Prisma.InputJsonValue;
        reason?: string;
        notes?: string;
      }> = [
        {
          businessId,
          subscriptionId: sub?.id,
          eventType: BusinessSubscriptionEventType.REACTIVATED,
          actionKey: 'REACTIVATE_BUSINESS',
          paymentId,
          fromState: before as unknown as Prisma.InputJsonValue,
          toState: after as unknown as Prisma.InputJsonValue,
          reason: dto.reason,
          notes: dto.notes,
        },
      ];

      if (dto.mode !== 'business_only') {
        events.push({
          businessId,
          subscriptionId: sub?.id,
          eventType: BusinessSubscriptionEventType.STATUS_CHANGED,
          actionKey: 'REACTIVATE_BUSINESS',
          fromState: before as unknown as Prisma.InputJsonValue,
          toState: after as unknown as Prisma.InputJsonValue,
          reason: dto.reason,
          notes: dto.notes,
        });
      }

      await this.eventService.createCorrelatedEvents(tx, correlationId, events, actor);
    });
  }

  async changePackage(
    businessId: string,
    dto: ChangePackageActionDto,
    actor: RequestUser,
  ): Promise<ActionResult> {
    if (dto.paymentOption === 'record_payment') {
      if (!dto.payment?.amount || !dto.payment.currency || !dto.payment.paymentMethod) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Record payment requires amount, currency, and payment method',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!dto.payment.paidAt) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'Record payment requires paidAt',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (dto.paymentOption === 'move_pending' && dto.payment?.paymentStatus === SubscriptionPaymentStatus.PAID) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Move pending cannot set paid payment status',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.executeAction(businessId, 'CHANGE_PACKAGE', actor, async (tx, correlationId, before) => {
      const tier = await tx.planTier.findFirst({
        where: { id: dto.planTierId, deletedAt: null },
        include: { planGroup: { select: { currency: true } } },
      });
      if (!tier) {
        throw new AppException(ErrorCode.NOT_FOUND, 'Plan tier not found', HttpStatus.NOT_FOUND);
      }

      const groupId = dto.planGroupId ?? tier.planGroupId;
      const existing = await tx.businessSubscription.findUnique({ where: { businessId } });

      const billingCycle =
        dto.billingCycle ??
        existing?.billingCycle ??
        BusinessSubscriptionBillingCycle.MONTHLY;

      assertCustomPeriodEndRequired(
        billingCycle,
        dto.currentPeriodEnd ?? existing?.currentPeriodEnd,
      );

      if (!dto.keepCurrentPrice) {
        assertTierPriceOrCustomAmount({
          billingCycle,
          tier,
          amount: dto.customPrice ? dto.amount : undefined,
          currency: dto.currency ?? existing?.currency ?? tier.planGroup.currency,
          customPrice: dto.customPrice,
        });
      }

      const currency =
        dto.currency ??
        existing?.currency ??
        tier.planGroup.currency ??
        'USD';

      let amount: number | undefined;
      if (dto.keepCurrentPrice && existing?.amount != null) {
        amount = Number(existing.amount);
      } else if (dto.customPrice && dto.amount != null) {
        amount = dto.amount;
      } else {
        const resolved = resolveTierPrice(tier, billingCycle, { currency });
        amount = resolved.amount ?? undefined;
      }

      const subscriptionStatus =
        dto.paymentOption === 'move_pending'
          ? SubscriptionStatus.PENDING_PAYMENT
          : dto.paymentOption === 'record_payment'
            ? SubscriptionStatus.ACTIVE
            : existing?.status ?? SubscriptionStatus.ACTIVE;

      const period = calculateSubscriptionPeriod({
        billingCycle,
        startDate:
          dto.currentPeriodStart ??
          existing?.currentPeriodStart ??
          new Date(),
        currentPeriodEnd: dto.currentPeriodEnd ?? existing?.currentPeriodEnd,
        trialDays: tier.trialDays,
        subscriptionStatus,
      });

      const oldTier = existing?.planTierId
        ? await tx.planTier.findUnique({ where: { id: existing.planTierId } })
        : null;
      const oldMonthly = normalizeMonthlyPrice(
        existing?.billingCycle ?? billingCycle,
        oldTier,
        existing?.amount,
      );
      const newMonthly = normalizeMonthlyPrice(billingCycle, tier, null);
      const tierChanged = existing?.planTierId !== dto.planTierId;
      const eventType = resolvePlanChangeEventType(
        oldMonthly,
        newMonthly,
        tierChanged,
      );

      const update: UpdateBusinessAccessDto = {
        planGroupId: groupId,
        planTierId: dto.planTierId,
        billingCycle,
        syncCapabilitiesFromTier: dto.syncCapabilities ?? true,
      };

      if (!dto.keepCurrentPrice && amount != null) {
        update.amount = amount;
        update.currency = currency;
      } else if (dto.currency) {
        update.currency = currency;
      }

      if (dto.currentPeriodStart || period.currentPeriodStart) {
        update.currentPeriodStart = (
          dto.currentPeriodStart
            ? new Date(dto.currentPeriodStart)
            : period.currentPeriodStart!
        )
          .toISOString()
          .slice(0, 10);
      }
      if (dto.currentPeriodEnd || period.currentPeriodEnd) {
        update.currentPeriodEnd = (
          dto.currentPeriodEnd
            ? new Date(dto.currentPeriodEnd)
            : period.currentPeriodEnd!
        )
          .toISOString()
          .slice(0, 10);
      }

      if (dto.paymentOption === 'move_pending') {
        update.businessStatus = BusinessStatus.NOT_ACTIVE;
        update.subscriptionStatus = SubscriptionStatus.PENDING_PAYMENT;
        update.paymentStatus = SubscriptionPaymentStatus.PENDING;
        update.paymentMethod = SubscriptionPaymentMethod.MANUAL_INVOICE;
      } else if (dto.paymentOption === 'record_payment') {
        update.businessStatus = BusinessStatus.ACTIVE;
        update.subscriptionStatus = SubscriptionStatus.ACTIVE;
        update.paymentStatus = SubscriptionPaymentStatus.PAID;
        update.paymentMethod =
          dto.payment?.paymentMethod ?? SubscriptionPaymentMethod.MANUAL_INVOICE;
      } else if (dto.paymentOption === 'keep_status') {
        // no payment/status changes
      }

      await this.accessService.updateAccessInternal(tx, businessId, update, actor, {
        skipAudit: true,
      });

      let paymentId: string | null = null;
      if (dto.paymentOption === 'record_payment' && dto.payment) {
        const payment = await this.paymentService.recordPayment(
          tx,
          businessId,
          {
            ...dto.payment,
            billingCycle: dto.payment.billingCycle ?? billingCycle,
            paymentStatus: SubscriptionPaymentStatus.PAID,
            periodStart:
              dto.payment.periodStart ?? update.currentPeriodStart ?? undefined,
            periodEnd:
              dto.payment.periodEnd ?? update.currentPeriodEnd ?? undefined,
          },
          actor,
        );
        paymentId = payment.id;
      }

      const after = await this.eventService.captureState(businessId, tx);
      const sub = await tx.businessSubscription.findUnique({ where: { businessId } });

      const events: Array<{
        businessId: string;
        subscriptionId?: string | null;
        eventType: BusinessSubscriptionEventType;
        actionKey: string;
        paymentId?: string | null;
        fromState: Prisma.InputJsonValue;
        toState: Prisma.InputJsonValue;
        reason?: string;
        notes?: string;
      }> = [
        {
          businessId,
          subscriptionId: sub?.id,
          eventType,
          actionKey: 'CHANGE_PACKAGE',
          paymentId,
          fromState: before as unknown as Prisma.InputJsonValue,
          toState: after as unknown as Prisma.InputJsonValue,
          reason: dto.reason,
          notes: dto.notes,
        },
      ];

      if (dto.paymentOption === 'record_payment' && paymentId) {
        events.push({
          businessId,
          subscriptionId: sub?.id,
          eventType: BusinessSubscriptionEventType.PAYMENT_MARKED_PAID,
          actionKey: 'CHANGE_PACKAGE',
          paymentId,
          fromState: before as unknown as Prisma.InputJsonValue,
          toState: after as unknown as Prisma.InputJsonValue,
        });
      } else if (dto.paymentOption === 'move_pending') {
        events.push({
          businessId,
          subscriptionId: sub?.id,
          eventType: BusinessSubscriptionEventType.PAYMENT_PENDING,
          actionKey: 'CHANGE_PACKAGE',
          fromState: before as unknown as Prisma.InputJsonValue,
          toState: after as unknown as Prisma.InputJsonValue,
        });
      }

      if (dto.syncCapabilities ?? true) {
        events.push({
          businessId,
          subscriptionId: sub?.id,
          eventType: BusinessSubscriptionEventType.CAPABILITIES_SYNCED,
          actionKey: 'CHANGE_PACKAGE',
          fromState: before as unknown as Prisma.InputJsonValue,
          toState: after as unknown as Prisma.InputJsonValue,
        });
      }

      await this.eventService.createCorrelatedEvents(tx, correlationId, events, actor);
    });
  }

  async changeSnapshot(
    businessId: string,
    dto: ChangeSnapshotActionDto,
    actor: RequestUser,
  ): Promise<ActionResult> {
    return this.executeAction(businessId, 'CHANGE_SNAPSHOT', actor, async (tx, correlationId, before) => {
      const business = await tx.business.findFirst({
        where: { id: businessId },
        include: { snapshot: { select: { id: true, name: true } } },
      });

      await this.accessService.updateAccessInternal(
        tx,
        businessId,
        {
          snapshotId: dto.snapshotId,
          applySnapshot: dto.applySnapshot ?? false,
        },
        actor,
        { skipAudit: true },
      );

      const after = await this.eventService.captureState(businessId, tx);
      const sub = await tx.businessSubscription.findUnique({ where: { businessId } });

      await this.eventService.createEvent(
        tx,
        {
          businessId,
          subscriptionId: sub?.id,
          eventType: BusinessSubscriptionEventType.SNAPSHOT_CHANGED,
          actionKey: 'CHANGE_SNAPSHOT',
          correlationId,
          fromState: before as unknown as Prisma.InputJsonValue,
          toState: after as unknown as Prisma.InputJsonValue,
          reason: dto.reason,
          notes: dto.notes,
          metadata: {
            oldSnapshotId: business?.snapshotId,
            newSnapshotId: dto.snapshotId,
            oldSnapshotName: business?.snapshot?.name,
            applySnapshot: dto.applySnapshot ?? false,
            mayOverwriteConfiguration: Boolean(dto.applySnapshot),
          },
        },
        actor,
      );
    });
  }

  async syncCapabilities(businessId: string, actor: RequestUser): Promise<ActionResult> {
    return this.executeAction(businessId, 'SYNC_CAPABILITIES', actor, async (tx, correlationId, before) => {
      const subscription = await tx.businessSubscription.findUnique({
        where: { businessId },
      });
      if (!subscription?.planTierId) {
        throw new AppException(
          ErrorCode.BAD_REQUEST,
          'No plan tier assigned',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.capabilitySyncService.syncFromPlanTier(
        businessId,
        subscription.planTierId,
      );

      const after = await this.eventService.captureState(businessId, tx);

      await this.eventService.createEvent(
        tx,
        {
          businessId,
          subscriptionId: subscription.id,
          eventType: BusinessSubscriptionEventType.CAPABILITIES_SYNCED,
          actionKey: 'SYNC_CAPABILITIES',
          correlationId,
          fromState: before as unknown as Prisma.InputJsonValue,
          toState: after as unknown as Prisma.InputJsonValue,
          metadata: {
            capabilityDiff: {
              added: [],
              removed: [],
              unchanged: [],
              preservedCustomManual: [],
              syncResult: result,
            },
          },
        },
        actor,
      );
    });
  }

  async recordRefund(
    businessId: string,
    originalPaymentId: string,
    dto: RefundPaymentDto,
    actor: RequestUser,
  ): Promise<ActionResult> {
    return this.executeAction(
      businessId,
      'RECORD_PAYMENT',
      actor,
      async (tx, correlationId, before) => {
        const refund = await this.paymentService.recordRefundOrCredit(
          tx,
          originalPaymentId,
          dto,
          actor,
        );

        const after = await this.eventService.captureState(businessId, tx);
        const sub = await tx.businessSubscription.findUnique({
          where: { businessId },
        });

        await this.eventService.createEvent(
          tx,
          {
            businessId,
            subscriptionId: sub?.id,
            eventType: BusinessSubscriptionEventType.PAYMENT_REFUNDED,
            actionKey: 'RECORD_PAYMENT',
            paymentId: refund.id,
            correlationId,
            fromState: before as unknown as Prisma.InputJsonValue,
            toState: after as unknown as Prisma.InputJsonValue,
            notes: dto.notes,
            metadata: { originalPaymentId },
          },
          actor,
        );
      },
    );
  }

  async applyManualAccessUpdate(
    businessId: string,
    dto: UpdateBusinessAccessDto & { reason: string; notes: string },
    actor: RequestUser,
  ): Promise<ActionResult> {
    if (!dto.reason?.trim() || !dto.notes?.trim()) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        'Reason and notes are required for manual adjustments',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.executeAction(businessId, 'MANUAL_ADJUSTMENT', actor, async (tx, correlationId, before) => {
      await this.accessService.updateAccessInternal(tx, businessId, dto, actor, {
        skipAudit: true,
      });
      const after = await this.eventService.captureState(businessId, tx);
      const sub = await tx.businessSubscription.findUnique({ where: { businessId } });

      await this.eventService.createEvent(
        tx,
        {
          businessId,
          subscriptionId: sub?.id,
          eventType: BusinessSubscriptionEventType.MANUAL_ADJUSTMENT,
          actionKey: 'MANUAL_ADJUSTMENT',
          correlationId,
          fromState: before as unknown as Prisma.InputJsonValue,
          toState: after as unknown as Prisma.InputJsonValue,
          reason: dto.reason,
          notes: dto.notes,
        },
        actor,
      );
    });
  }

  async emitBusinessCreatedEvents(
    businessId: string,
    actor: RequestUser,
    source: BusinessSubscriptionEventSource = BusinessSubscriptionEventSource.ADMIN,
  ): Promise<void> {
    const correlationId = randomUUID();
    const before = await this.eventService.captureState(businessId);
    const sub = await this.prisma.businessSubscription.findUnique({
      where: { businessId },
    });

    await this.prisma.$transaction(async (tx) => {
      const after = await this.eventService.captureState(businessId, tx);
      await this.eventService.createCorrelatedEvents(
        tx,
        correlationId,
        [
          {
            businessId,
            subscriptionId: sub?.id,
            eventType: BusinessSubscriptionEventType.CREATED,
            actionKey: 'MANUAL_ADJUSTMENT',
            source,
            fromState: before as unknown as Prisma.InputJsonValue,
            toState: after as unknown as Prisma.InputJsonValue,
          },
          {
            businessId,
            subscriptionId: sub?.id,
            eventType: BusinessSubscriptionEventType.STATUS_CHANGED,
            actionKey: 'MANUAL_ADJUSTMENT',
            source,
            fromState: before as unknown as Prisma.InputJsonValue,
            toState: after as unknown as Prisma.InputJsonValue,
          },
        ],
        actor,
      );
    });
  }

  private async executeAction(
    businessId: string,
    actionKey: SubscriptionActionKey,
    actor: RequestUser,
    mutation: (
      tx: Prisma.TransactionClient,
      correlationId: string,
      beforeState: SubscriptionStateSnapshot,
    ) => Promise<void>,
  ): Promise<ActionResult> {
    const beforeState = await this.eventService.captureState(businessId);
    const action = this.availabilityService.resolveAction(actionKey, beforeState);

    if (!action.enabled) {
      throw new AppException(
        ErrorCode.BAD_REQUEST,
        action.disabledReason ?? 'Action not available',
        HttpStatus.BAD_REQUEST,
      );
    }

    const correlationId = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      await mutation(tx, correlationId, beforeState);
    });

    const access = await this.accessService.getAccess(businessId);
    return { ...access, correlationId };
  }

  private buildAccessImpact(
    before: SubscriptionStateSnapshot,
    after: SubscriptionStateSnapshot,
  ) {
    return {
      beforeCanAccess: before.accessResolution?.canAccessWorkspace ?? false,
      afterCanAccess: after.accessResolution?.canAccessWorkspace ?? false,
      beforeReason: before.accessResolution?.reasonLabel ?? '',
      afterReason: after.accessResolution?.reasonLabel ?? '',
    };
  }

  private buildPaymentImpact(
    actionKey: SubscriptionActionKey,
    input?: Record<string, unknown>,
  ) {
    if (actionKey === 'RECORD_PAYMENT' || actionKey === 'MARK_PAID') {
      return {
        createsPaymentRecord: true,
        amount: input?.amount as number | undefined,
        currency: input?.currency as string | undefined,
      };
    }
    return undefined;
  }

  private buildWarnings(
    actionKey: SubscriptionActionKey,
    before: SubscriptionStateSnapshot,
    after: SubscriptionStateSnapshot,
  ): string[] {
    const warnings: string[] = [];

    if (
      before.accessResolution?.canAccessWorkspace &&
      !after.accessResolution?.canAccessWorkspace
    ) {
      warnings.push('This action will revoke workspace access.');
    }

    if (actionKey === 'CHANGE_PACKAGE') {
      warnings.push('This package change applies immediately.');
    }

    if (actionKey === 'REACTIVATE_BUSINESS') {
      warnings.push(
        'business_only mode reactivates the workspace without restoring subscription status.',
      );
    }

    return warnings;
  }

  private async computeAfterState(
    businessId: string,
    actionKey: SubscriptionActionKey,
    input: Record<string, unknown> | undefined,
    before: SubscriptionStateSnapshot,
  ): Promise<SubscriptionStateSnapshot> {
    const after = { ...before };

    switch (actionKey) {
      case 'MARK_PAID':
        after.businessStatus = BusinessStatus.ACTIVE;
        after.subscriptionStatus = SubscriptionStatus.ACTIVE;
        after.paymentStatus = SubscriptionPaymentStatus.PAID;
        break;
      case 'MOVE_PENDING':
        after.businessStatus = BusinessStatus.NOT_ACTIVE;
        after.subscriptionStatus = SubscriptionStatus.PENDING_PAYMENT;
        after.paymentStatus = SubscriptionPaymentStatus.PENDING;
        break;
      case 'SUSPEND_BUSINESS':
        after.businessStatus = BusinessStatus.SUSPENDED;
        break;
      case 'CANCEL_SUBSCRIPTION':
        after.businessStatus = BusinessStatus.NOT_ACTIVE;
        after.subscriptionStatus = SubscriptionStatus.CANCELED;
        break;
      case 'EXPIRE_TRIAL':
        after.businessStatus = BusinessStatus.NOT_ACTIVE;
        after.subscriptionStatus = SubscriptionStatus.EXPIRED;
        break;
      case 'REACTIVATE_BUSINESS':
        after.businessStatus = BusinessStatus.ACTIVE;
        break;
      case 'CHANGE_PACKAGE':
        if (input?.planTierId) after.planTierId = input.planTierId as string;
        break;
      default:
        break;
    }

    return this.projectAccessResolution(businessId, after);
  }

  private projectAccessResolution(
    businessId: string,
    snapshot: SubscriptionStateSnapshot,
  ): SubscriptionStateSnapshot {
    const resolution = this.accessResolver.resolve({
      businessId,
      businessStatus: snapshot.businessStatus,
      snapshotId: snapshot.snapshotId,
      snapshotAppliedAt: snapshot.snapshotAppliedAt
        ? new Date(snapshot.snapshotAppliedAt)
        : null,
      subscription:
        snapshot.subscriptionStatus != null
          ? {
              status: snapshot.subscriptionStatus,
              planTierId: snapshot.planTierId,
              paymentStatus:
                snapshot.paymentStatus ?? SubscriptionPaymentStatus.NOT_REQUIRED,
              currentPeriodEnd: this.snapshotPeriodEnd(snapshot),
            }
          : null,
      capabilities: (snapshot.capabilityKeys ?? []).map((key) => ({
        key,
        name: key,
      })),
    });

    return {
      ...snapshot,
      accessResolution: {
        canAccessWorkspace: resolution.canAccessWorkspace,
        reasonCode: resolution.reasonCode,
        reasonLabel: resolution.reasonLabel,
        warnings: resolution.warnings,
      },
    };
  }

  /** Reads period end from snapshot; falls back to legacy trialEnd in stored event JSON. */
  private snapshotPeriodEnd(
    snapshot: SubscriptionStateSnapshot & { trialEnd?: string | null },
  ): Date | null {
    const end = snapshot.currentPeriodEnd ?? snapshot.trialEnd;
    return end ? new Date(end) : null;
  }

}
