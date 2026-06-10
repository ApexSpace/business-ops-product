import { HttpStatus, Injectable } from '@nestjs/common';
import {
  BusinessSubscriptionEvent,
  BusinessSubscriptionEventSource,
  BusinessSubscriptionEventType,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { RequestUser } from '@app/common/decorators/current-user.decorator';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { PrismaService } from '@app/core/database/prisma.service';
import {
  BusinessSubscriptionEventDetailDto,
  BusinessSubscriptionEventListItemDto,
  ListSubscriptionEventsQueryDto,
  SubscriptionEventsListDto,
} from '../dto/business-subscription-event.dto';
import {
  BusinessSubscriptionEventRepository,
  CreateSubscriptionEventInput,
} from '../repositories/business-subscription-event.repository';
import { BusinessAccessResolverService } from './business-access-resolver.service';
import { BusinessEffectiveCapabilitiesService } from './business-effective-capabilities.service';
import { SubscriptionStateSnapshot } from '../types/subscription-state-snapshot.types';

const EVENT_TITLES: Partial<Record<BusinessSubscriptionEventType, string>> = {
  CREATED: 'Subscription created',
  STATUS_CHANGED: 'Subscription status changed',
  PLAN_CHANGED: 'Plan changed',
  UPGRADED: 'Plan upgraded',
  DOWNGRADED: 'Plan downgraded',
  TRIAL_EXTENDED: 'Trial extended',
  TRIAL_EXPIRED: 'Trial expired',
  PAYMENT_MARKED_PAID: 'Payment marked as paid',
  PAYMENT_PENDING: 'Moved to pending payment',
  PAYMENT_REFUNDED: 'Payment refunded',
  PARTIAL_PAYMENT_RECORDED: 'Partial payment recorded',
  CANCELED: 'Subscription canceled',
  EXPIRED: 'Subscription expired',
  REACTIVATED: 'Business reactivated',
  SUSPENDED: 'Business suspended',
  CAPABILITIES_SYNCED: 'Capabilities synced from plan tier',
  SNAPSHOT_CHANGED: 'Snapshot changed',
  MANUAL_ADJUSTMENT: 'Manual access adjustment',
};

const PAYMENT_RELATED_EVENT_TYPES = new Set<BusinessSubscriptionEventType>([
  BusinessSubscriptionEventType.PAYMENT_MARKED_PAID,
  BusinessSubscriptionEventType.PAYMENT_PENDING,
  BusinessSubscriptionEventType.PAYMENT_FAILED,
  BusinessSubscriptionEventType.PAYMENT_REFUNDED,
  BusinessSubscriptionEventType.PARTIAL_PAYMENT_RECORDED,
]);

const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Active',
  TRIALING: 'Trialing',
  PENDING_PAYMENT: 'Pending payment',
  CANCELED: 'Canceled',
  EXPIRED: 'Expired',
  INTERNAL: 'Internal',
  PAST_DUE: 'Past due',
};

@Injectable()
export class BusinessSubscriptionEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventRepository: BusinessSubscriptionEventRepository,
    private readonly accessResolver: BusinessAccessResolverService,
    private readonly effectiveCapabilitiesService: BusinessEffectiveCapabilitiesService,
  ) {}

  async captureState(
    businessId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<SubscriptionStateSnapshot> {
    const client = tx ?? this.prisma;
    const business = await client.business.findFirst({
      where: { id: businessId, deletedAt: null },
      include: {
        snapshot: { select: { id: true, name: true } },
        subscription: {
          include: {
            planGroup: { select: { id: true, name: true } },
            planTier: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!business) {
      return {
        businessStatus: 'NOT_ACTIVE' as SubscriptionStateSnapshot['businessStatus'],
      };
    }

    const [resolution, effectiveCapabilities] = await Promise.all([
      this.accessResolver.resolveForBusiness(businessId),
      this.effectiveCapabilitiesService.resolveEffectiveCapabilities(businessId),
    ]);

    const sub = business.subscription;

    return {
      businessStatus: business.status,
      subscriptionStatus: sub?.status ?? null,
      paymentMethod: sub?.paymentMethod ?? null,
      paymentStatus: sub?.paymentStatus ?? null,
      planGroupId: sub?.planGroupId ?? null,
      planTierId: sub?.planTierId ?? null,
      planTierName: sub?.planTier?.name ?? null,
      snapshotId: business.snapshotId,
      snapshotName: business.snapshot?.name ?? null,
      snapshotAppliedAt: business.snapshotAppliedAt?.toISOString() ?? null,
      billingCycle: sub?.billingCycle ?? null,
      currentPeriodStart: sub?.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
      amount: sub?.amount?.toString() ?? null,
      currency: sub?.currency ?? null,
      capabilityKeys: effectiveCapabilities.map((c) => c.key),
      accessResolution: {
        canAccessWorkspace: resolution.canAccessWorkspace,
        reasonCode: resolution.reasonCode,
        reasonLabel: resolution.reasonLabel,
        warnings: resolution.warnings,
      },
    };
  }

  async createEvent(
    tx: Prisma.TransactionClient,
    input: Omit<CreateSubscriptionEventInput, 'title'> & {
      title?: string;
      source?: BusinessSubscriptionEventSource;
    },
    actor?: RequestUser,
  ): Promise<BusinessSubscriptionEvent> {
    const actorName = actor?.email;

    return this.eventRepository.create(
      {
        ...input,
        title: input.title ?? EVENT_TITLES[input.eventType] ?? input.eventType,
        source: input.source ?? BusinessSubscriptionEventSource.ADMIN,
        createdById: input.createdById ?? actor?.id,
        createdByNameSnapshot: input.createdByNameSnapshot ?? actorName,
      },
      tx,
    );
  }

  async createCorrelatedEvents(
    tx: Prisma.TransactionClient,
    correlationId: string,
    events: Array<
      Omit<CreateSubscriptionEventInput, 'correlationId' | 'title'> & {
        title?: string;
        source?: BusinessSubscriptionEventSource;
      }
    >,
    actor?: RequestUser,
  ): Promise<void> {
    const actorName = actor?.email;
    await this.eventRepository.createMany(
      events.map((event) => ({
        ...event,
        correlationId,
        title: event.title ?? EVENT_TITLES[event.eventType] ?? event.eventType,
        source: event.source ?? BusinessSubscriptionEventSource.ADMIN,
        createdById: event.createdById ?? actor?.id,
        createdByNameSnapshot: event.createdByNameSnapshot ?? actorName,
      })),
      tx,
    );
  }

  async listEvents(
    businessId: string,
    query: ListSubscriptionEventsQueryDto,
  ): Promise<SubscriptionEventsListDto> {
    const limit = query.limit ?? 20;
    const rows = await this.eventRepository.findMany({
      businessId,
      eventType: query.eventTypes?.length ? undefined : query.eventType,
      eventTypes: query.eventTypes,
      source: query.source,
      severity: query.severity,
      subscriptionStatus: query.subscriptionStatus,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      search: query.search,
      cursor: query.cursor,
      limit,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: items.map((row) => this.toListItemDto(row)),
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
      hasMore,
    };
  }

  async getEvent(
    businessId: string,
    eventId: string,
  ): Promise<BusinessSubscriptionEventDetailDto> {
    const row = await this.eventRepository.findById(eventId);
    if (!row || row.businessId !== businessId) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Subscription event not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return this.toDetailDto(row);
  }

  private toListItemDto(
    row: BusinessSubscriptionEvent,
  ): BusinessSubscriptionEventListItemDto {
    const fromState = row.fromState as SubscriptionStateSnapshot | null;
    const toState = row.toState as SubscriptionStateSnapshot | null;

    return {
      id: row.id,
      subscriptionId: row.subscriptionId,
      eventType: row.eventType,
      title: row.title,
      source: row.source,
      severity: row.severity,
      actionKey: row.actionKey,
      paymentId: row.paymentId,
      createdByNameSnapshot: row.createdByNameSnapshot,
      notes: row.notes,
      planTierLabel: derivePlanTierLabel(fromState, toState),
      statusTransition: deriveStatusTransition(fromState, toState),
      paymentSnippet: derivePaymentSnippet(row.eventType, row.paymentId, fromState, toState),
      createdAt: row.createdAt,
    };
  }

  private toDetailDto(row: BusinessSubscriptionEvent): BusinessSubscriptionEventDetailDto {
    return {
      id: row.id,
      businessId: row.businessId,
      subscriptionId: row.subscriptionId,
      eventType: row.eventType,
      title: row.title,
      description: row.description,
      fromState: row.fromState as SubscriptionStateSnapshot | null,
      toState: row.toState as SubscriptionStateSnapshot | null,
      source: row.source,
      severity: row.severity,
      correlationId: row.correlationId,
      actionKey: row.actionKey,
      paymentId: row.paymentId,
      reason: row.reason,
      notes: row.notes,
      metadata: row.metadata as Record<string, unknown> | null,
      createdById: row.createdById,
      createdByNameSnapshot: row.createdByNameSnapshot,
      createdAt: row.createdAt,
    };
  }
}

function derivePlanTierLabel(
  fromState: SubscriptionStateSnapshot | null,
  toState: SubscriptionStateSnapshot | null,
): string | null {
  const from = fromState?.planTierName?.trim() || null;
  const to = toState?.planTierName?.trim() || null;
  if (!from && !to) return null;
  if (!from || from === to) return to ?? from;
  if (!to) return from;
  return `${from} → ${to}`;
}

function deriveStatusTransition(
  fromState: SubscriptionStateSnapshot | null,
  toState: SubscriptionStateSnapshot | null,
): string | null {
  const from = fromState?.subscriptionStatus
    ? SUBSCRIPTION_STATUS_LABELS[fromState.subscriptionStatus]
    : null;
  const to = toState?.subscriptionStatus
    ? SUBSCRIPTION_STATUS_LABELS[toState.subscriptionStatus]
    : null;
  if (!from && !to) return null;
  if (!from || from === to) return to ?? from;
  if (!to) return from;
  return `${from} → ${to}`;
}

function derivePaymentSnippet(
  eventType: BusinessSubscriptionEventType,
  paymentId: string | null | undefined,
  fromState: SubscriptionStateSnapshot | null,
  toState: SubscriptionStateSnapshot | null,
): string | null {
  const isPaymentRelated =
    paymentId != null || PAYMENT_RELATED_EVENT_TYPES.has(eventType);
  if (!isPaymentRelated) return null;

  const state = toState ?? fromState;
  const parts: string[] = [];
  if (state?.paymentStatus) {
    parts.push(formatPaymentStatusLabel(state.paymentStatus));
  }
  if (state?.amount) {
    parts.push(
      state.currency ? `${state.amount} ${state.currency}` : state.amount,
    );
  }
  return parts.length > 0 ? parts.join(' · ') : 'Linked';
}

function formatPaymentStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
