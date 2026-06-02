"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Estimate, Invoice, PaginatedResult, Payment } from "@/types/api";

const CONTACT_FINANCIAL_LIMIT = 100;

export function useContactFinancialRecords(
  contactId: string,
  enabled: boolean,
) {
  const listFilters = {
    contactId,
    page: 1,
    limit: CONTACT_FINANCIAL_LIMIT,
  };

  const estimatesQuery = useQuery({
    queryKey: queryKeys.estimates.list(listFilters),
    queryFn: () =>
      apiClient<PaginatedResult<Estimate>>("estimates", {
        searchParams: {
          page: 1,
          limit: CONTACT_FINANCIAL_LIMIT,
          contactId,
        },
      }),
    enabled: enabled && !!contactId,
  });

  const invoicesQuery = useQuery({
    queryKey: queryKeys.invoices.list(listFilters),
    queryFn: () =>
      apiClient<PaginatedResult<Invoice>>("invoices", {
        searchParams: {
          page: 1,
          limit: CONTACT_FINANCIAL_LIMIT,
          contactId,
        },
      }),
    enabled: enabled && !!contactId,
  });

  const paymentsQuery = useQuery({
    queryKey: queryKeys.payments.list(listFilters),
    queryFn: () =>
      apiClient<PaginatedResult<Payment>>("payments", {
        searchParams: {
          page: 1,
          limit: CONTACT_FINANCIAL_LIMIT,
          contactId,
        },
      }),
    enabled: enabled && !!contactId,
  });

  const estimates = estimatesQuery.data?.items ?? [];
  const invoices = invoicesQuery.data?.items ?? [];
  const payments = paymentsQuery.data?.items ?? [];

  return {
    estimates,
    invoices,
    payments,
    isLoading:
      estimatesQuery.isLoading ||
      invoicesQuery.isLoading ||
      paymentsQuery.isLoading,
  };
}
