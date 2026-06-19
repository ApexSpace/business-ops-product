import {
  buildFormFieldLabelMap,
  resolveSubmissionFieldLabel,
} from "@/features/forms/utils/form-field-label-map.util";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatSubmissionValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value.map((item) => formatSubmissionValue(item)).join(", ");
  }
  if (typeof value === "string" && UUID_PATTERN.test(value)) {
    return "Uploaded file";
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
      return `${label}: ${formatSubmissionValue(value)}`;
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
