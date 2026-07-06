/** Maps snapshot nav item keys to sidebar section groups (CodeSol layout). */
export const BUSINESS_NAV_SECTION_DEFINITIONS = [
  {
    id: "general",
    label: "General",
    keys: ["dashboard", "contacts", "conversations", "pipelines"],
  },
  {
    id: "operations",
    label: "Operations",
    keys: [
      "appointments",
      "time-clock",
      "payments",
      "work-items",
      "sales",
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    keys: ["gift-cards", "packages", "memberships", "products", "offers"],
  },
] as const;

export type BusinessNavSectionId =
  (typeof BUSINESS_NAV_SECTION_DEFINITIONS)[number]["id"];

const KEY_TO_SECTION = new Map<string, BusinessNavSectionId>(
  BUSINESS_NAV_SECTION_DEFINITIONS.flatMap((section) =>
    section.keys.map((key) => [key, section.id]),
  ),
);

export function resolveNavSectionId(navKey: string): BusinessNavSectionId | null {
  return KEY_TO_SECTION.get(navKey) ?? null;
}
