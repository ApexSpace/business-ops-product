import { InvoiceStatus, PaymentStatus } from '@prisma/client';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { CheckoutsService } from './checkouts.service';
import * as checkoutMapper from '../mappers/checkout.mapper';

describe('CheckoutsService.voidCheckout (SALE-AUD-02)', () => {
  const businessId = 'biz-1';
  const saleId = 'sale-1';
  const actor = { id: 'user-1' } as never;
  const openCheckout = {
    id: saleId,
    status: InvoiceStatus.OPEN,
    items: [],
    metadata: null,
  };

  let checkoutRepository: { findById: jest.Mock; update: jest.Mock };
  let prisma: {
    payment: { count: jest.Mock; findMany: jest.Mock; update: jest.Mock };
  };
  let stripePaymentIntent: { cancelForPayment: jest.Mock };
  let auditService: { log: jest.Mock };
  let checkoutAdvancedSettings: { getForCheckout: jest.Mock };
  let service: CheckoutsService;

  beforeEach(() => {
    checkoutRepository = {
      findById: jest.fn().mockResolvedValue(openCheckout),
      update: jest.fn().mockResolvedValue({
        ...openCheckout,
        status: InvoiceStatus.VOID,
      }),
    };
    prisma = {
      payment: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    stripePaymentIntent = {
      cancelForPayment: jest.fn().mockResolvedValue(undefined),
    };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    checkoutAdvancedSettings = {
      getForCheckout: jest.fn().mockResolvedValue({}),
    };

    service = new CheckoutsService(
      checkoutRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      auditService as never,
      {} as never,
      {} as never,
      {} as never,
      checkoutAdvancedSettings as never,
      stripePaymentIntent as never,
    );

    jest
      .spyOn(checkoutMapper, 'toCheckoutResponse')
      .mockReturnValue({ id: saleId, status: InvoiceStatus.VOID } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('voids an unpaid open sale and writes checkout.voided', async () => {
    const result = await service.voidCheckout(businessId, saleId, actor);

    expect(checkoutRepository.update).toHaveBeenCalledWith(
      businessId,
      saleId,
      expect.objectContaining({ status: InvoiceStatus.VOID }),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'checkout.voided', entityId: saleId }),
    );
    expect(result.id).toBe(saleId);
  });

  it('blocks void when SUCCEEDED tenders exist', async () => {
    prisma.payment.count.mockResolvedValue(1);

    await expect(
      service.voidCheckout(businessId, saleId, actor),
    ).rejects.toMatchObject({
      code: ErrorCode.BAD_REQUEST,
    });
    expect(checkoutRepository.update).not.toHaveBeenCalled();
    expect(stripePaymentIntent.cancelForPayment).not.toHaveBeenCalled();
  });

  it('cancels leftover PENDING PaymentIntents on the Connect account then voids', async () => {
    prisma.payment.findMany.mockResolvedValue([
      { id: 'pay-pending', stripePaymentIntentId: 'pi_open' },
    ]);

    await service.voidCheckout(businessId, saleId, actor);

    expect(stripePaymentIntent.cancelForPayment).toHaveBeenCalledWith(
      businessId,
      'pi_open',
    );
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-pending' },
      data: { status: PaymentStatus.CANCELLED },
    });
    expect(checkoutRepository.update).toHaveBeenCalled();
  });

  it('still voids when Stripe cancel of a PENDING intent fails', async () => {
    prisma.payment.findMany.mockResolvedValue([
      { id: 'pay-pending', stripePaymentIntentId: 'pi_open' },
    ]);
    stripePaymentIntent.cancelForPayment.mockRejectedValue(
      new Error('Stripe not connected'),
    );

    await service.voidCheckout(businessId, saleId, actor);

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay-pending' },
      data: { status: PaymentStatus.CANCELLED },
    });
    expect(checkoutRepository.update).toHaveBeenCalled();
  });
});
