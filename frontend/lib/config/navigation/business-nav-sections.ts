/** Primary sidebar items — flat, no category headers. */
export const BUSINESS_PRIMARY_NAV_KEYS = [
  "dashboard",
  "appointments",
  "work-items",
  "pipelines",
  "conversations",
  "contacts",
  "sales",
] as const;

/** Secondary apps shown in the Apps launcher (MangoMint-style). */
export const BUSINESS_APPS_NAV_KEYS = [
  "gift-cards",
  "packages",
  "memberships",
  "products",
  "offers",
  "payments",
  "time-clock",
  "time-cards",
] as const;

export type BusinessPrimaryNavKey = (typeof BUSINESS_PRIMARY_NAV_KEYS)[number];
export type BusinessAppsNavKey = (typeof BUSINESS_APPS_NAV_KEYS)[number];

const PRIMARY_KEY_SET = new Set<string>(BUSINESS_PRIMARY_NAV_KEYS);
const APPS_KEY_SET = new Set<string>(BUSINESS_APPS_NAV_KEYS);

export function isPrimaryNavKey(navKey: string): navKey is BusinessPrimaryNavKey {
  return PRIMARY_KEY_SET.has(navKey);
}

export function isAppsNavKey(navKey: string): navKey is BusinessAppsNavKey {
  return APPS_KEY_SET.has(navKey);
}

/** @deprecated Use BUSINESS_PRIMARY_NAV_KEYS / BUSINESS_APPS_NAV_KEYS */
export const BUSINESS_NAV_SECTION_DEFINITIONS = [
  {
    id: "primary",
    label: "",
    keys: [...BUSINESS_PRIMARY_NAV_KEYS],
  },
  {
    id: "apps",
    label: "Apps",
    keys: [...BUSINESS_APPS_NAV_KEYS],
  },
] as const;

export type BusinessNavSectionId =
  (typeof BUSINESS_NAV_SECTION_DEFINITIONS)[number]["id"];

/** @deprecated Use isPrimaryNavKey / isAppsNavKey */
export function resolveNavSectionId(
  navKey: string,
): BusinessNavSectionId | null {
  if (isPrimaryNavKey(navKey)) return "primary";
  if (isAppsNavKey(navKey)) return "apps";
  return null;
}
