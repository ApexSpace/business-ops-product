import { api } from "@/lib/api/client";

export interface GlobalSearchResult {
  id: string;
  type: "contact" | "appointment" | "invoice" | "product";
  label: string;
  subtitle?: string;
  href: string;
}

export interface GlobalSearchResponse {
  items: GlobalSearchResult[];
}

export function globalSearch(q: string, limit = 20) {
  return api.get<GlobalSearchResponse>("search", {
    searchParams: { q, limit },
  });
}
