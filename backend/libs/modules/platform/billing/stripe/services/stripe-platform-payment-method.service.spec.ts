import { AppException } from '@app/common/exceptions/app.exception';
import { PLATFORM_SUBSCRIPTION_PURPOSE } from '../types/stripe-platform-billing.types';
import { StripePlatformPaymentMethodService } from './stripe-platform-payment-method.service';

describe('StripePlatformPaymentMethodService', () => {
  const businessId = 'biz_1';
  const setupIntentId = 'seti_1';
  const stripeCustomerId = 'cus_1';
  const stripePaymentMethodId = 'pm_1';

  const prisma = {
    businessStripeCustomer: {
      findUnique: jest.fn(),
    },
    businessPaymentMethod: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const stripe = {
    setupIntents: {
      retrieve: jest.fn(),
    },
    paymentMethods: {
      retrieve: jest.fn(),
      list: jest.fn(),
    },
    customers: {
      update: jest.fn(),
      retrieve: jest.fn(),
    },
  };

  const stripeApi = {
    getClient: jest.fn(() => stripe),
    logStripeError: jest.fn(),
  };

  const service = new StripePlatformPaymentMethodService(
    prisma as never,
    stripeApi as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('confirmSetupIntent', () => {
    it('syncs payment method from Stripe and returns local cards', async () => {
      stripe.setupIntents.retrieve.mockResolvedValue({
        id: setupIntentId,
        status: 'succeeded',
        customer: stripeCustomerId,
        payment_method: stripePaymentMethodId,
        metadata: {
          businessId,
          purpose: PLATFORM_SUBSCRIPTION_PURPOSE,
        },
      });
      prisma.businessStripeCustomer.findUnique.mockResolvedValue({
        id: 'local_cus_1',
        businessId,
        stripeCustomerId,
      });
      prisma.businessPaymentMethod.findFirst.mockResolvedValue(null);
      stripe.paymentMethods.retrieve.mockResolvedValue({
        id: stripePaymentMethodId,
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2030,
        },
      });
      prisma.businessPaymentMethod.updateMany.mockResolvedValue({ count: 0 });
      prisma.businessPaymentMethod.create.mockResolvedValue({});
      stripe.customers.update.mockResolvedValue({});
      prisma.businessPaymentMethod.findMany.mockResolvedValue([
        {
          id: 'bpm_1',
          brand: 'visa',
          last4: '4242',
          expMonth: 12,
          expYear: 2030,
          isDefault: true,
          createdAt: new Date(),
        },
      ]);

      const result = await service.confirmSetupIntent(
        businessId,
        setupIntentId,
      );

      expect(stripe.setupIntents.retrieve).toHaveBeenCalledWith(setupIntentId);
      expect(prisma.businessPaymentMethod.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          businessId,
          stripePaymentMethodId,
          brand: 'visa',
          last4: '4242',
          isDefault: true,
        }),
      });
      expect(result).toEqual([
        expect.objectContaining({ last4: '4242', brand: 'visa' }),
      ]);
    });

    it('rejects setup intents for another business', async () => {
      stripe.setupIntents.retrieve.mockResolvedValue({
        id: setupIntentId,
        status: 'succeeded',
        customer: stripeCustomerId,
        payment_method: stripePaymentMethodId,
        metadata: {
          businessId: 'other_biz',
          purpose: PLATFORM_SUBSCRIPTION_PURPOSE,
        },
      });

      await expect(
        service.confirmSetupIntent(businessId, setupIntentId),
      ).rejects.toBeInstanceOf(AppException);
      expect(prisma.businessPaymentMethod.create).not.toHaveBeenCalled();
    });
  });

  describe('reconcileFromStripe', () => {
    it('mirrors Stripe cards into local rows', async () => {
      prisma.businessStripeCustomer.findUnique.mockResolvedValue({
        id: 'local_cus_1',
        businessId,
        stripeCustomerId,
      });
      stripe.paymentMethods.list.mockResolvedValue({
        data: [
          {
            id: stripePaymentMethodId,
            card: {
              brand: 'mastercard',
              last4: '4444',
              exp_month: 1,
              exp_year: 2028,
            },
          },
        ],
      });
      stripe.customers.retrieve.mockResolvedValue({
        deleted: undefined,
        invoice_settings: {
          default_payment_method: stripePaymentMethodId,
        },
      });
      prisma.businessPaymentMethod.findMany.mockResolvedValue([]);
      prisma.businessPaymentMethod.create.mockResolvedValue({});

      await service.reconcileFromStripe(businessId);

      expect(prisma.businessPaymentMethod.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          stripePaymentMethodId,
          brand: 'mastercard',
          last4: '4444',
          isDefault: true,
        }),
      });
    });
  });
});
