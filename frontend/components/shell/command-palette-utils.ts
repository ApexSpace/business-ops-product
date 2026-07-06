import type { GlobalSearchResult } from "@/lib/api/search.api";

export const SEARCH_RESULT_GROUPS = [
  { type: "contact", label: "Contacts" },
  { type: "appointment", label: "Appointments" },
  { type: "invoice", label: "Invoices" },
  { type: "product", label: "Products" },
] as const satisfies ReadonlyArray<{
  type: GlobalSearchResult["type"];
  label: string;
}>;

export function groupSearchResults(items: GlobalSearchResult[]) {
  return SEARCH_RESULT_GROUPS.map((group) => ({
    ...group,
    items: items.filter((item) => item.type === group.type),
  })).filter((group) => group.items.length > 0);
}
