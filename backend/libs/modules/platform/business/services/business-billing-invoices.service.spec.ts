import {
  BusinessSubscriptionPaymentType,
  SubscriptionBillingSource,
  SubscriptionPaymentStatus,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { BusinessBillingInvoicesService } from './business-billing-invoices.service';

function buildService() {
  const prisma = {
    businessSubscription: {
      findUnique: jest.fn(),
    },
  };
  const paymentRepository = {
    findMany: jest.fn(),
  };
  const stripeApiService = {
    isConfigured: jest.fn(),
    getClient: jest.fn(),
  };
  const metadataService = {
    parseSubscriptionStripeMetadata: jest.fn(),
  };

  const service = new BusinessBillingInvoicesService(
    prisma as never,
    paymentRepository as never,
    stripeApiService as never,
    metadataService as never,
  );

  return {
    service,
    prisma,
    paymentRepository,
    stripeApiService,
    metadataService,
  };
}

describe('BusinessBillingInvoicesService', () => {
  it('lists only Stripe invoices matching the current subscription ID', async () => {
    const {
      service,
      prisma,
      stripeApiService,
      metadataService,
      paymentRepository,
    } = buildService();

    const invoicesList = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'in_current',
          subscription: 'sub_current',
          created: 1_700_000_000,
          amount_paid: 2900,
          currency: 'usd',
          status: 'paid',
          hosted_invoice_url: 'https://invoice.stripe.com/i/current',
          lines: { data: [{ description: 'Pro monthly' }] },
          status_transitions: { paid_at: 1_700_000_100 },
        },
        {
          id: 'in_old',
          subscription: 'sub_old',
          created: 1_600_000_000,
          amount_paid: 1900,
          currency: 'usd',
          status: 'paid',
        },
        {
          id: 'in_standalone',
          subscription: null,
          created: 1_500_000_000,
          amount_paid: 500,
          currency: 'usd',
          status: 'paid',
        },
      ],
    });

    prisma.businessSubscription.findUnique.mockResolvedValue({
      billingSource: SubscriptionBillingSource.STRIPE,
      metadata: {
        stripe: { customerId: 'cus_123', subscriptionId: 'sub_current' },
      },
      planGroup: { name: 'Pro Plans' },
      planTier: { name: 'Pro' },
    });
    metadataService.parseSubscriptionStripeMetadata.mockReturnValue({
      customerId: 'cus_123',
      subscriptionId: 'sub_current',
    });
    stripeApiService.isConfigured.mockReturnValue(true);
    stripeApiService.getClient.mockReturnValue({
      invoices: { list: invoicesList },
    });

    const result = await service.listCurrentInvoices('biz-1', { limit: 20 });

    expect(invoicesList).toHaveBeenCalledWith({
      customer: 'cus_123',
      subscription: 'sub_current',
      limit: 21,
    });
    expect(paymentRepository.findMany).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'in_current',
      amount: '29.00',
      currency: 'USD',
      status: SubscriptionPaymentStatus.PAID,
      description: 'Pro monthly',
      billingSource: SubscriptionBillingSource.STRIPE,
      stripeHostedInvoiceUrl: 'https://invoice.stripe.com/i/current',
    });
    expect(result.hasMore).toBe(false);
  });

  it('returns an empty list when all Stripe invoices have null subscription', async () => {
    const { service, prisma, stripeApiService, metadataService } =
      buildService();

    prisma.businessSubscription.findUnique.mockResolvedValue({
      billingSource: SubscriptionBillingSource.STRIPE,
      metadata: {
        stripe: { customerId: 'cus_123', subscriptionId: 'sub_current' },
      },
      planGroup: { name: 'Pro Plans' },
      planTier: { name: 'Pro' },
    });
    metadataService.parseSubscriptionStripeMetadata.mockReturnValue({
      customerId: 'cus_123',
      subscriptionId: 'sub_current',
    });
    stripeApiService.isConfigured.mockReturnValue(true);
    stripeApiService.getClient.mockReturnValue({
      invoices: {
        list: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'in_standalone_1',
              subscription: null,
              created: 1_700_000_000,
              amount_paid: 2900,
              currency: 'usd',
              status: 'paid',
            },
            {
              id: 'in_standalone_2',
              subscription: null,
              created: 1_600_000_000,
              amount_paid: 1900,
              currency: 'usd',
              status: 'paid',
            },
          ],
        }),
      },
    });

    const result = await service.listCurrentInvoices('biz-1', { limit: 20 });

    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('returns an empty list without customer-wide fallback when subscription ID is missing', async () => {
    const { service, prisma, stripeApiService, metadataService } =
      buildService();

    prisma.businessSubscription.findUnique.mockResolvedValue({
      billingSource: SubscriptionBillingSource.STRIPE,
      metadata: { stripe: { customerId: 'cus_123' } },
      planTier: { name: 'Pro' },
    });
    metadataService.parseSubscriptionStripeMetadata.mockReturnValue({
      customerId: 'cus_123',
    });
    stripeApiService.isConfigured.mockReturnValue(true);
    stripeApiService.getClient.mockReturnValue({
      invoices: { list: jest.fn() },
    });

    const result = await service.listCurrentInvoices('biz-1', { limit: 20 });

    expect(stripeApiService.getClient).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it('lists local payment records for manual billing without hosted URLs', async () => {
    const { service, prisma, paymentRepository } = buildService();

    prisma.businessSubscription.findUnique.mockResolvedValue({
      billingSource: SubscriptionBillingSource.MANUAL,
      metadata: null,
      planGroup: { name: 'Starter Plans' },
      planTier: { name: 'Starter' },
    });
    paymentRepository.findMany.mockResolvedValue([
      {
        id: 'pay-1',
        amount: new Prisma.Decimal('49.00'),
        currency: 'USD',
        paymentStatus: SubscriptionPaymentStatus.PAID,
        paymentType: BusinessSubscriptionPaymentType.SUBSCRIPTION,
        billingCycle: 'MONTHLY',
        paidAt: new Date('2026-01-15T00:00:00.000Z'),
        recordedAt: new Date('2026-01-15T00:00:00.000Z'),
        notes: null,
        voidedAt: null,
      },
    ]);

    const result = await service.listCurrentInvoices('biz-1', { limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'pay-1',
      amount: '49',
      billingSource: SubscriptionBillingSource.MANUAL,
      stripeHostedInvoiceUrl: null,
    });
  });

  it('lists all Stripe customer invoices for platform admin scope', async () => {
    const {
      service,
      prisma,
      stripeApiService,
      metadataService,
    } = buildService();

    const subscriptionsRetrieve = jest.fn().mockImplementation((id: string) => {
      if (id === 'sub_old') {
        return Promise.resolve({
          metadata: {
            planGroupId: 'group-old',
            planTierId: 'tier-old',
          },
        });
      }

      return Promise.resolve({
        metadata: {
          planGroupId: 'group-current',
          planTierId: 'tier-current',
        },
      });
    });

    const invoicesList = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'in_current',
          subscription: 'sub_current',
          created: 1_700_000_000,
          amount_paid: 2900,
          currency: 'usd',
          status: 'paid',
          hosted_invoice_url: 'https://invoice.stripe.com/i/current',
          lines: { data: [{ description: 'Pro monthly' }] },
          status_transitions: { paid_at: 1_700_000_100 },
        },
        {
          id: 'in_old',
          subscription: 'sub_old',
          created: 1_600_000_000,
          amount_paid: 1900,
          currency: 'usd',
          status: 'paid',
        },
        {
          id: 'in_standalone',
          subscription: null,
          created: 1_500_000_000,
          amount_paid: 500,
          currency: 'usd',
          status: 'paid',
        },
      ],
    });

    prisma.businessSubscription.findUnique.mockResolvedValue({
      billingSource: SubscriptionBillingSource.STRIPE,
      metadata: {
        stripe: { customerId: 'cus_123', subscriptionId: 'sub_current' },
      },
      planGroup: { name: 'Pro Plans' },
      planTier: { name: 'Pro' },
    });
    metadataService.parseSubscriptionStripeMetadata.mockReturnValue({
      customerId: 'cus_123',
      subscriptionId: 'sub_current',
    });
    stripeApiService.isConfigured.mockReturnValue(true);
    stripeApiService.getClient.mockReturnValue({
      invoices: { list: invoicesList },
      subscriptions: { retrieve: subscriptionsRetrieve },
    });
    prisma.planGroup = {
      findMany: jest.fn().mockResolvedValue([
        { id: 'group-old', name: 'Legacy Plans' },
        { id: 'group-current', name: 'Pro Plans' },
      ]),
    };
    prisma.planTier = {
      findMany: jest.fn().mockResolvedValue([
        { id: 'tier-old', name: 'Basic' },
        { id: 'tier-current', name: 'Pro' },
      ]),
    };

    const result = await service.listAllInvoicesForBusiness('biz-1', {
      limit: 20,
    });

    expect(invoicesList).toHaveBeenCalledWith({
      customer: 'cus_123',
      limit: 21,
    });
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toMatchObject({
      id: 'in_current',
      planGroupName: 'Pro Plans',
      planTierName: 'Pro',
    });
    expect(result.items[1]).toMatchObject({
      id: 'in_old',
      planGroupName: 'Legacy Plans',
      planTierName: 'Basic',
    });
    expect(result.items[2]).toMatchObject({
      id: 'in_standalone',
      planGroupName: null,
      planTierName: null,
    });
  });
});
