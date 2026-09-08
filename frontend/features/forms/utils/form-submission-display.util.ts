import {
  buildFormFieldLabelMap,
  resolveSubmissionFieldLabel,
} from "@/features/forms/utils/form-field-label-map.util";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CollectPaymentSubmissionValue = {
  amount?: number;
  amountCents?: number;
  currency?: string;
  status?: string;
  livemode?: boolean;
  paymentIntentId?: string;
  attemptId?: string;
};

function isCollectPaymentSubmissionValue(
  value: unknown,
): value is CollectPaymentSubmissionValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.paymentIntentId === "string" ||
    (typeof record.amountCents === "number" &&
      typeof record.currency === "string" &&
      typeof record.status === "string")
  );
}

function formatPaymentStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCollectPaymentSubmissionValue(
  value: CollectPaymentSubmissionValue,
  compact: boolean,
): string {
  const currency = (value.currency ?? "USD").toUpperCase();
  const amount =
    typeof value.amount === "number"
      ? value.amount
      : typeof value.amountCents === "number"
        ? value.amountCents / 100
        : null;

  const formattedAmount =
    amount != null
      ? new Intl.NumberFormat(undefined, {
          style: "currency",
          currency,
        }).format(amount)
      : null;

  const status = value.status ? formatPaymentStatus(value.status) : null;
  const mode =
    typeof value.livemode === "boolean"
      ? value.livemode
        ? "Live"
        : "Test"
      : null;

  const summary = [formattedAmount, status, mode].filter(Boolean).join(" · ");

  if (compact || !value.paymentIntentId) {
    return summary || "Payment recorded";
  }

  return `${summary}\nPayment ID: ${value.paymentIntentId}`;
}

function formatSubmissionValue(value: unknown, compact = false): string {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value
      .map((item) => formatSubmissionValue(item, compact))
      .join(", ");
  }
  if (typeof value === "string" && UUID_PATTERN.test(value)) {
    return "Uploaded file";
  }
  if (isCollectPaymentSubmissionValue(value)) {
    return formatCollectPaymentSubmissionValue(value, compact);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function formatSubmissionSummary(
  data: Record<string, unknown>,
  options?: {
    maxEntries?: number;
    labelMap?: Map<string, string>;
  },
): string {
  const maxEntries = options?.maxEntries ?? 3;
  const entries = Object.entries(data).filter(
    ([, value]) => value != null && value !== "",
  );

  if (entries.length === 0) return "No data";

  return entries
    .slice(0, maxEntries)
    .map(([key, value]) => {
      const label = resolveSubmissionFieldLabel(key, options?.labelMap);
      return `${label}: ${formatSubmissionValue(value, true)}`;
    })
    .join(" · ");
}

export function formatSubmissionEntries(
  data: Record<string, unknown>,
  labelMap?: Map<string, string>,
): Array<{ key: string; label: string; value: string }> {
  return Object.entries(data).map(([key, value]) => ({
    key,
    label: resolveSubmissionFieldLabel(key, labelMap),
    value: formatSubmissionValue(value),
  }));
}

export { buildFormFieldLabelMap };
