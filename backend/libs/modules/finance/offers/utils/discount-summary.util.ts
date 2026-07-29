import {
  DiscountAmountType,
  DiscountAppliesTo,
  DiscountScope,
} from '@prisma/client';

type DiscountSummaryInput = {
  appliesTo: DiscountAppliesTo;
  amountType: DiscountAmountType;
  amount: { toString(): string } | number | string;
  serviceScope: DiscountScope;
  productScope: DiscountScope;
};

function formatAmount(
  amountType: DiscountAmountType,
  amount: { toString(): string } | number | string,
): string {
  const num = Number(amount.toString());
  if (amountType === DiscountAmountType.PERCENTAGE) {
    return `${num % 1 === 0 ? num.toFixed(0) : num}%`;
  }
  return `$${num.toFixed(2)}`;
}

export function buildDiscountSummary(discount: DiscountSummaryInput): {
  summary: string;
  subtext: string;
} {
  const amountLabel = formatAmount(discount.amountType, discount.amount);

  if (discount.appliesTo === DiscountAppliesTo.ENTIRE_SALE) {
    return {
      summary: `${amountLabel} off entire sale`,
      subtext: 'Discount applies to the entire sale total',
    };
  }

  if (discount.appliesTo === DiscountAppliesTo.SERVICES) {
    if (discount.serviceScope === DiscountScope.ALL) {
      return {
        summary: `${amountLabel} off all services`,
        subtext: 'Discount applies to all services',
      };
    }
    return {
      summary: `${amountLabel} off specific services`,
      subtext: 'Discount only applies to selected services',
    };
  }

  if (discount.productScope === DiscountScope.ALL) {
    return {
      summary: `${amountLabel} off all products`,
      subtext: 'Discount applies to all products',
    };
  }
  return {
    summary: `${amountLabel} off specific products`,
    subtext: 'Discount only applies to selected products',
  };
}
