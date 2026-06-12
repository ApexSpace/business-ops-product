function formatSubmissionValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    return value.map((item) => formatSubmissionValue(item)).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function formatSubmissionSummary(
  data: Record<string, unknown>,
  maxEntries = 3,
): string {
  const entries = Object.entries(data).filter(
    ([, value]) => value != null && value !== "",
  );

  if (entries.length === 0) return "No data";

  return entries
    .slice(0, maxEntries)
    .map(([key, value]) => `${key}: ${formatSubmissionValue(value)}`)
    .join(" · ");
}

export function formatSubmissionEntries(
  data: Record<string, unknown>,
): Array<{ key: string; value: string }> {
  return Object.entries(data).map(([key, value]) => ({
    key,
    value: formatSubmissionValue(value),
  }));
}
