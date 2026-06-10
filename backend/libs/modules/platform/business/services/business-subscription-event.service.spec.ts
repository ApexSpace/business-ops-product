import {
  BusinessSubscriptionEventType,
  SubscriptionStatus,
} from '@prisma/client';
import { BusinessSubscriptionEventRepository } from '../repositories/business-subscription-event.repository';
import { BusinessSubscriptionEventService } from './business-subscription-event.service';

describe('BusinessSubscriptionEventService', () => {
  const prisma = {
    business: { findFirst: jest.fn() },
  } as never;

  const eventRepository = {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    findById: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<
      BusinessSubscriptionEventRepository,
      'create' | 'createMany' | 'findMany' | 'findById'
    >
  >;

  const accessResolver = {
    resolveForBusiness: jest.fn().mockResolvedValue({
      canAccessWorkspace: true,
      reasonCode: 'SUBSCRIPTION_ACTIVE',
      reasonLabel: 'Active subscription.',
      warnings: [],
      needsAttention: [],
      effectiveCapabilities: [],
    }),
  } as never;

  const effectiveCapabilitiesService = {
    resolveEffectiveCapabilities: jest.fn().mockResolvedValue([
      { key: 'crm', name: 'CRM' },
    ]),
  } as never;

  const service = new BusinessSubscriptionEventService(
    prisma,
    eventRepository as unknown as BusinessSubscriptionEventRepository,
    accessResolver,
    effectiveCapabilitiesService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    eventRepository.findMany.mockResolvedValue([]);
  });

  it('captureState includes access resolution', async () => {
    (prisma as { business: { findFirst: jest.Mock } }).business.findFirst.mockResolvedValue({
      id: 'b1',
      status: 'ACTIVE',
      snapshotId: null,
      snapshotAppliedAt: null,
      snapshot: null,
      subscription: {
        status: 'ACTIVE',
        paymentMethod: 'MANUAL_INVOICE',
        paymentStatus: 'PAID',
        planGroupId: 'g1',
        planTierId: 't1',
        planGroup: { id: 'g1', name: 'Pro' },
        planTier: { id: 't1', name: 'Growth' },
        metadata: {},
        amount: { toString: () => '99' },
        currency: 'USD',
        currentPeriodStart: null,
        currentPeriodEnd: null,
      },
    });

    const snapshot = await service.captureState('b1');

    expect(snapshot.accessResolution?.canAccessWorkspace).toBe(true);
    expect(snapshot.capabilityKeys).toEqual(['crm']);
    expect(snapshot.billingCycle).toBeNull();
  });

  it('listEvents maps summary projections without full state blobs', async () => {
    eventRepository.findMany.mockResolvedValue([
      {
        id: 'e1',
        businessId: 'b1',
        subscriptionId: 'sub-1',
        eventType: BusinessSubscriptionEventType.PLAN_CHANGED,
        title: 'Plan changed',
        description: null,
        source: 'ADMIN',
        severity: 'INFO',
        correlationId: 'corr-1',
        actionKey: 'CHANGE_PACKAGE',
        paymentId: null,
        reason: null,
        createdById: null,
        createdByNameSnapshot: 'admin@test.com',
        notes: null,
        metadata: null,
        fromState: {
          planTierName: 'Starter',
          subscriptionStatus: SubscriptionStatus.TRIALING,
        },
        toState: {
          planTierName: 'Growth',
          subscriptionStatus: SubscriptionStatus.ACTIVE,
        },
        createdAt: new Date('2026-01-01'),
      },
    ] as never);

    const result = await service.listEvents('b1', { limit: 10 });

    expect(result.items[0]).toMatchObject({
      id: 'e1',
      planTierLabel: 'Starter → Growth',
      statusTransition: 'Trialing → Active',
    });
    expect(result.items[0]).not.toHaveProperty('fromState');
    expect(result.items[0]).not.toHaveProperty('toState');
  });

  it('listEvents passes search to repository', async () => {
    await service.listEvents('b1', {
      search: 'upgrade',
      limit: 10,
    });

    expect(eventRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'b1',
        search: 'upgrade',
        limit: 10,
      }),
    );
  });

  it('listEvents passes subscriptionStatus to repository', async () => {
    await service.listEvents('b1', {
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      limit: 10,
    });

    expect(eventRepository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'b1',
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        limit: 10,
      }),
    );
  });

  it('createCorrelatedEvents assigns shared correlationId', async () => {
    const tx = {} as never;
    await service.createCorrelatedEvents(
      tx,
      'corr-1',
      [
        {
          businessId: 'b1',
          eventType: BusinessSubscriptionEventType.CREATED,
        },
        {
          businessId: 'b1',
          eventType: BusinessSubscriptionEventType.STATUS_CHANGED,
        },
      ],
      { id: 'u1', email: 'admin@test.com', context: 'platform' },
    );

    expect(eventRepository.createMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ correlationId: 'corr-1' }),
      ]),
      tx,
    );
  });
});
