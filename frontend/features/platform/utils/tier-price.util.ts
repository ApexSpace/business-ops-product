import type { BusinessSubscriptionBillingCycle } from "@/features/platform/types/business-subscription";

type TierPrices = {
  priceMonthly?: string | null;
  priceYearly?: string | null;
  setupFee?: string | null;
};

export function resolveTierPriceFromStrings(
  tier: TierPrices | null | undefined,
  billingCycle: BusinessSubscriptionBillingCycle,
  customAmount?: number | null,
): number | null {
  if (customAmount != null) return customAmount;

  switch (billingCycle) {
    case "MONTHLY":
      return tier?.priceMonthly ? Number(tier.priceMonthly) : null;
    case "YEARLY":
      return tier?.priceYearly ? Number(tier.priceYearly) : null;
    case "ONE_TIME":
      return tier?.setupFee
        ? Number(tier.setupFee)
        : tier?.priceMonthly
          ? Number(tier.priceMonthly)
          : null;
    case "CUSTOM":
      return null;
    default:
      return null;
  }
}

export function formatBillingCycleLabel(
  cycle?: string | null,
): string {
  switch (cycle) {
    case "MONTHLY":
      return "Monthly";
    case "YEARLY":
      return "Yearly";
    case "ONE_TIME":
      return "One-time";
    case "CUSTOM":
      return "Custom";
    default:
      return "—";
  }
}

export function addMonthsToDateInput(value: string, months: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  const day = date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth() + months);
  if (date.getUTCDate() < day) {
    date.setUTCDate(0);
  }
  return date.toISOString().slice(0, 10);
}

export function addYearsToDateInput(value: string, years: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString().slice(0, 10);
}

export function computePeriodEndFromBillingCycle(
  billingCycle: BusinessSubscriptionBillingCycle,
  startDate: string,
): string | null {
  if (billingCycle === "MONTHLY") return addMonthsToDateInput(startDate, 1);
  if (billingCycle === "YEARLY") return addYearsToDateInput(startDate, 1);
  if (billingCycle === "ONE_TIME") return startDate;
  return null;
}
