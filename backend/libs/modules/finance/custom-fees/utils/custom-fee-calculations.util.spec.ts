import {
  CustomFeeAmountType,
  CustomFeeApplicationScope,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import {
  applyEntireSaleFees,
  applyPaymentMethodFees,
  resolveCustomFeeAmount,
} from './custom-fee-calculations.util';

describe('custom-fee-calculations.util', () => {
  const entireSaleFee = {
    id: 'fee-1',
    name: 'Eco fee',
    applicationScope: CustomFeeApplicationScope.ENTIRE_SALE,
    paymentMethods: [],
    amountType: CustomFeeAmountType.PERCENTAGE,
    amount: new Prisma.Decimal(10),
    isEnabled: true,
    sortOrder: 0,
  };

  const cardFee = {
    id: 'fee-2',
    name: 'Card convenience fee',
    applicationScope: CustomFeeApplicationScope.PAYMENT_METHOD,
    paymentMethods: [PaymentMethod.CARD],
    amountType: CustomFeeAmountType.FIXED,
    amount: new Prisma.Decimal(2),
    isEnabled: true,
    sortOrder: 1,
  };

  it('resolves percentage entire-sale fee', () => {
    const lines = applyEntireSaleFees([entireSaleFee], 100);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.amount.toString()).toBe('10');
  });

  it('resolves fixed payment-method fee', () => {
    const lines = applyPaymentMethodFees([cardFee], PaymentMethod.CARD, 50);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.amount.toString()).toBe('2');
  });

  it('caps fixed fee at base amount', () => {
    const amount = resolveCustomFeeAmount(
      { amountType: CustomFeeAmountType.FIXED, amount: 100 },
      25,
    );
    expect(amount.toString()).toBe('25');
  });
});
