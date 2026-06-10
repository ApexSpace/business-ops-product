import type {
  BusinessAccessSubscription,
  SubscriptionAccessStatus,
} from "@/features/platform/types/business-access";

function formatMoney(amount: string, currency?: string | null): string {
  const trimmed = amount.trim();
  if (!trimmed) return "Not set";
  const num = Number(trimmed);
  if (!Number.isNaN(num)) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency?.trim() || "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(num);
    } catch {
      return currency ? `${trimmed} ${currency}` : trimmed;
    }
  }
  return currency ? `${trimmed} ${currency}` : trimmed;
}

export function resolveSubscriptionTotal(sub?: BusinessAccessSubscription | null): {
  amount: string | null;
  currency: string | null;
  display: string;
  isSet: boolean;
} {
  if (!sub) {
    return { amount: null, currency: null, display: "Not set", isSet: false };
  }

  const amount = sub.amount ?? sub.suggestedAmount ?? null;
  const currency = sub.currency ?? sub.suggestedCurrency ?? null;

  if (!amount) {
    return { amount: null, currency, display: "Price not set", isSet: false };
  }

  const base = formatMoney(amount, currency);
  const cycle = sub.billingCycle?.trim().toLowerCase();
  let display = base;
  if (cycle === "monthly") display = `${base} / month`;
  else if (cycle === "yearly") display = `${base} / year`;

  return { amount, currency, display, isSet: true };
}

export function formatBillingPeriod(
  start?: string | null,
  end?: string | null,
): string {
  const fmt = (v?: string | null) =>
    v ? new Date(v).toLocaleDateString() : null;
  const s = fmt(start);
  const e = fmt(end);
  if (s && e) return `${s} – ${e}`;
  if (e) return `Through ${e}`;
  if (s) return `From ${s}`;
  return "Not set";
}

export function resolveNextBillingLabel(sub?: BusinessAccessSubscription | null): {
  label: string;
  value: string;
} {
  if (!sub) {
    return { label: "Next billing date", value: "Not set" };
  }

  if (sub.nextBillingLabel) {
    const date = sub.nextBillingDate
      ? new Date(sub.nextBillingDate).toLocaleDateString()
      : sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd).toLocaleDateString()
        : null;
    return {
      label: sub.nextBillingLabel,
      value:
        date ??
        (sub.status === "INTERNAL" ? "No billing required" : "Not set"),
    };
  }

  const date = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString()
    : null;

  switch (sub.status) {
    case "TRIALING":
      return {
        label: "Trial ends",
        value: date ?? "Next billing date not set",
      };
    case "ACTIVE":
      return {
        label: "Next billing date",
        value: date ?? "Next billing date not set",
      };
    case "PENDING_PAYMENT":
      return {
        label: "Payment due",
        value: date ?? "Not set",
      };
    case "CANCELED":
      return {
        label: "Ended",
        value: sub.canceledAt
          ? new Date(sub.canceledAt).toLocaleDateString()
          : date ?? "Canceled",
      };
    case "EXPIRED":
      return { label: "Expired", value: date ?? "Expired" };
    case "INTERNAL":
      return { label: "Billing", value: "No billing required" };
    case "PAST_DUE":
      return {
        label: "Payment due",
        value: date ?? "Past due",
      };
    default:
      return {
        label: "Next billing date",
        value: date ?? "Not set",
      };
  }
}

export function subscriptionStatusAllowsPeriodEnd(
  status: SubscriptionAccessStatus,
): boolean {
  return status === "ACTIVE" || status === "TRIALING" || status === "PENDING_PAYMENT";
}
