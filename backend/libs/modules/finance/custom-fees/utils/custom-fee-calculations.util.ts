import { Prisma } from '@prisma/client';
import {
  CustomFeeAmountType,
  CustomFeeApplicationScope,
  PaymentMethod,
} from '@prisma/client';

export type CustomFeeLike = {
  id: string;
  name: string;
  applicationScope: CustomFeeApplicationScope;
  paymentMethods: PaymentMethod[];
  amountType: CustomFeeAmountType;
  amount: Prisma.Decimal | string | number;
  isEnabled: boolean;
  sortOrder: number;
};

export type ResolvedCustomFeeLine = {
  feeId: string;
  name: string;
  amount: Prisma.Decimal;
};

function toDecimal(value: Prisma.Decimal | string | number): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export function resolveCustomFeeAmount(
  fee: Pick<CustomFeeLike, 'amountType' | 'amount'>,
  baseAmount: Prisma.Decimal | number | string,
): Prisma.Decimal {
  const base = toDecimal(baseAmount);
  if (base.lte(0)) {
    return new Prisma.Decimal(0);
  }

  const configured = toDecimal(fee.amount);
  if (fee.amountType === CustomFeeAmountType.PERCENTAGE) {
    const percent = configured;
    if (percent.lte(0) || percent.gt(100)) {
      throw new Error('Fee percentage must be between 1 and 100');
    }
    return base.mul(percent).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  if (configured.lte(0)) {
    throw new Error('Fee amount must be greater than zero');
  }

  return configured.gt(base)
    ? base.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    : configured.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function applyEntireSaleFees(
  fees: CustomFeeLike[],
  merchandiseSubtotal: Prisma.Decimal | number | string,
): ResolvedCustomFeeLine[] {
  const base = toDecimal(merchandiseSubtotal);
  return fees
    .filter((fee) => fee.applicationScope === CustomFeeApplicationScope.ENTIRE_SALE)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((fee) => {
      const amount = resolveCustomFeeAmount(fee, base);
      return {
        feeId: fee.id,
        name: fee.name,
        amount,
      };
    })
    .filter((line) => line.amount.gt(0));
}

export function applyPaymentMethodFees(
  fees: CustomFeeLike[],
  paymentMethod: PaymentMethod,
  paymentAmount: Prisma.Decimal | number | string,
): ResolvedCustomFeeLine[] {
  const base = toDecimal(paymentAmount);
  return fees
    .filter(
      (fee) =>
        fee.applicationScope === CustomFeeApplicationScope.PAYMENT_METHOD &&
        fee.paymentMethods.includes(paymentMethod),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((fee) => ({
      feeId: fee.id,
      name: fee.name,
      amount: resolveCustomFeeAmount(fee, base),
    }))
    .filter((line) => line.amount.gt(0));
}

export function assertValidCustomFeeInput(params: {
  applicationScope: CustomFeeApplicationScope;
  paymentMethods?: PaymentMethod[];
  amountType: CustomFeeAmountType;
  amount: Prisma.Decimal | string | number;
}) {
  if (params.applicationScope === CustomFeeApplicationScope.PAYMENT_METHOD) {
    if (!params.paymentMethods?.length) {
      throw new Error('Select at least one payment method');
    }
  }

  const amount = toDecimal(params.amount);
  if (params.amountType === CustomFeeAmountType.PERCENTAGE) {
    if (amount.lte(0) || amount.gt(100)) {
      throw new Error('Percentage must be between 1 and 100');
    }
    return;
  }

  if (amount.lte(0)) {
    throw new Error('Amount must be greater than zero');
  }
}

export function readCustomFeeIdFromMetadata(
  metadata: Prisma.JsonValue | null | undefined,
): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const feeId = (metadata as Record<string, unknown>).customFeeId;
  return typeof feeId === 'string' ? feeId : null;
}

export function readPaymentMethodFromFeeMetadata(
  metadata: Prisma.JsonValue | null | undefined,
): PaymentMethod | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const method = (metadata as Record<string, unknown>).paymentMethod;
  return typeof method === 'string' ? (method as PaymentMethod) : null;
}
