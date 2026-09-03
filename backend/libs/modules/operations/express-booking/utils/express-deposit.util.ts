import { ExpressDepositType, Prisma } from '@prisma/client';

export type ExpressDepositResolution = {
  chargeAmount: Prisma.Decimal;
  servicePrice: Prisma.Decimal;
  isFullPayment: boolean;
  remainingBalance: Prisma.Decimal;
};

function toDecimal(value: Prisma.Decimal | string | number | null | undefined) {
  if (value == null) {
    return new Prisma.Decimal(0);
  }
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export function resolveExpressDeposit(params: {
  depositType: ExpressDepositType;
  depositAmount: Prisma.Decimal | string | number | null | undefined;
  servicePrice: Prisma.Decimal | string | number | null | undefined;
}): ExpressDepositResolution {
  const servicePrice = toDecimal(params.servicePrice);
  if (servicePrice.lte(0)) {
    return {
      chargeAmount: new Prisma.Decimal(0),
      servicePrice,
      isFullPayment: true,
      remainingBalance: new Prisma.Decimal(0),
    };
  }

  if (params.depositType === ExpressDepositType.FULL) {
    return {
      chargeAmount: servicePrice,
      servicePrice,
      isFullPayment: true,
      remainingBalance: new Prisma.Decimal(0),
    };
  }

  const configured = toDecimal(params.depositAmount);
  let chargeAmount: Prisma.Decimal;

  if (params.depositType === ExpressDepositType.PERCENTAGE) {
    const percent = configured;
    if (percent.lte(0) || percent.gt(100)) {
      throw new Error('Deposit percentage must be between 1 and 100');
    }
    chargeAmount = servicePrice.mul(percent).div(100);
  } else {
    if (configured.lte(0)) {
      throw new Error('Deposit amount must be greater than zero');
    }
    chargeAmount = configured;
  }

  if (chargeAmount.gt(servicePrice)) {
    chargeAmount = servicePrice;
  }

  const remainingBalance = servicePrice.sub(chargeAmount);
  const isFullPayment = remainingBalance.lte(0);

  return {
    chargeAmount: isFullPayment ? servicePrice : chargeAmount,
    servicePrice,
    isFullPayment,
    remainingBalance: isFullPayment ? new Prisma.Decimal(0) : remainingBalance,
  };
}

export function assertValidExpressDepositPreferences(params: {
  expressRequireDeposit?: boolean;
  expressDepositType?: ExpressDepositType;
  expressDepositAmount?: Prisma.Decimal | string | number | null;
}) {
  if (!params.expressRequireDeposit) {
    return;
  }

  const type = params.expressDepositType ?? ExpressDepositType.FULL;
  if (type === ExpressDepositType.FULL) {
    return;
  }

  const amount = toDecimal(params.expressDepositAmount);
  if (type === ExpressDepositType.PERCENTAGE) {
    if (amount.lte(0) || amount.gt(100)) {
      throw new Error(
        'Deposit percentage must be between 1 and 100 when partial deposit is enabled',
      );
    }
    return;
  }

  if (amount.lte(0)) {
    throw new Error('Deposit amount must be greater than zero when fixed deposit is enabled');
  }
}
