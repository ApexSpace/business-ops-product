import { HttpStatus } from '@nestjs/common';
import {
  CustomFeeAmountType,
  CustomFeeApplicationScope,
  PaymentMethod,
} from '@prisma/client';
import { CustomFeesService } from './custom-fees.service';

describe('CustomFeesService', () => {
  const repository = {
    findMany: jest.fn(),
    findById: jest.fn(),
    findEnabled: jest.fn(),
    nextSortOrder: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
  const auditService = { log: jest.fn() };
  const service = new CustomFeesService(
    repository as never,
    auditService as never,
  );
  const actor = { id: 'user-1', businessId: 'biz-1' } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.nextSortOrder.mockResolvedValue(0);
  });

  it('rejects payment-method fee without methods', async () => {
    await expect(
      service.create(
        'biz-1',
        {
          name: 'Card fee',
          applicationScope: CustomFeeApplicationScope.PAYMENT_METHOD,
          amountType: CustomFeeAmountType.FIXED,
          amount: 2,
        },
        actor,
      ),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
  });

  it('creates entire-sale fee', async () => {
    repository.create.mockResolvedValue({
      id: 'fee-1',
      businessId: 'biz-1',
      name: 'Eco fee',
      applicationScope: CustomFeeApplicationScope.ENTIRE_SALE,
      paymentMethods: [],
      amountType: CustomFeeAmountType.PERCENTAGE,
      amount: { toString: () => '5' },
      isEnabled: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create(
      'biz-1',
      {
        name: 'Eco fee',
        applicationScope: CustomFeeApplicationScope.ENTIRE_SALE,
        amountType: CustomFeeAmountType.PERCENTAGE,
        amount: 5,
      },
      actor,
    );

    expect(result.id).toBe('fee-1');
    expect(repository.create).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalled();
  });

  it('creates payment-method fee with methods', async () => {
    repository.create.mockResolvedValue({
      id: 'fee-2',
      businessId: 'biz-1',
      name: 'Card fee',
      applicationScope: CustomFeeApplicationScope.PAYMENT_METHOD,
      paymentMethods: [PaymentMethod.CARD],
      amountType: CustomFeeAmountType.FIXED,
      amount: { toString: () => '2' },
      isEnabled: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.create(
      'biz-1',
      {
        name: 'Card fee',
        applicationScope: CustomFeeApplicationScope.PAYMENT_METHOD,
        paymentMethods: [PaymentMethod.CARD],
        amountType: CustomFeeAmountType.FIXED,
        amount: 2,
      },
      actor,
    );

    expect(repository.create).toHaveBeenCalledWith(
      'biz-1',
      expect.objectContaining({
        paymentMethods: [PaymentMethod.CARD],
      }),
    );
  });
});
