export const ENTITY_ID_PARAM = "id";
export const ENTITY_TAB_PARAM = "tab";

/** Legacy selection query params kept for backward-compatible deep links. */
export const LEGACY_ENTITY_ID_PARAMS = [
  "id",
  "product",
  "contact",
  "selected",
  "sale",
] as const;

export type LegacyEntityIdParam = (typeof LEGACY_ENTITY_ID_PARAMS)[number];

export function readEntityIdFromSearchParams(
  searchParams: URLSearchParams,
  legacyParams: string[] = [...LEGACY_ENTITY_ID_PARAMS],
): string | null {
  for (const key of legacyParams) {
    const value = searchParams.get(key);
    if (value) return value;
  }
  return null;
}

export function buildEntitySelectionParams(
  searchParams: URLSearchParams,
  updates: { id?: string | null; tab?: string | null },
  options?: {
    legacyParamsToClear?: string[];
  },
): URLSearchParams {
  const next = new URLSearchParams(searchParams.toString());
  const legacyToClear =
    options?.legacyParamsToClear ?? LEGACY_ENTITY_ID_PARAMS.filter((k) => k !== "id");

  if (updates.id !== undefined) {
    for (const key of legacyToClear) {
      next.delete(key);
    }
    if (updates.id) {
      next.set(ENTITY_ID_PARAM, updates.id);
    } else {
      next.delete(ENTITY_ID_PARAM);
    }
  }

  if (updates.tab !== undefined) {
    if (updates.tab) {
      next.set(ENTITY_TAB_PARAM, updates.tab);
    } else {
      next.delete(ENTITY_TAB_PARAM);
    }
  }

  return next;
}
