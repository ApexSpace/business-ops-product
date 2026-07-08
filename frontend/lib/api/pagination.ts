export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PaginatedList<T> = {
  items: T[];
  meta: PaginationMeta;
};

export function toSearchParams(
  params?: Record<
    string,
    string | number | boolean | Array<string | number> | undefined | null
  >,
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  if (!params) return out;
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      const items = value
        .filter((item) => item !== undefined && item !== null && item !== "")
        .map(String);
      if (items.length > 0) out[key] = items;
    } else {
      out[key] = String(value);
    }
  }
  return out;
}
