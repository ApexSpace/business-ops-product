import type { QueryClient } from "@tanstack/react-query";
import { invalidateFinancialLists } from "@/features/payments/workspace/payments-workspace";

export function invalidateContactFinancial(queryClient: QueryClient) {
  return invalidateFinancialLists(queryClient);
}

export const CONTACT_FINANCIAL_SECTIONS = [
  "estimates",
  "invoices",
  "payments",
] as const;

export type ContactFinancialSectionId =
  (typeof CONTACT_FINANCIAL_SECTIONS)[number];

export function isContactFinancialSection(
  section: string,
): section is ContactFinancialSectionId {
  return CONTACT_FINANCIAL_SECTIONS.includes(
    section as ContactFinancialSectionId,
  );
}
