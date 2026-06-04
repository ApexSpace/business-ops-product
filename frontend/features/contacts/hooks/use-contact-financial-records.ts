"use client";

import { useQuery } from "@tanstack/react-query";
import { listEstimates } from "@/features/estimates/api/estimates.api";
import { listInvoices } from "@/features/invoices/api/invoices.api";
import { listPayments } from "@/features/payments/api/payments.api";
import { queryKeys } from "@/lib/query/keys";

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
    queryFn: () => listEstimates(listFilters),
    enabled: enabled && !!contactId,
  });

  const invoicesQuery = useQuery({
    queryKey: queryKeys.invoices.list(listFilters),
    queryFn: () => listInvoices(listFilters),
    enabled: enabled && !!contactId,
  });

  const paymentsQuery = useQuery({
    queryKey: queryKeys.payments.list(listFilters),
    queryFn: () => listPayments(listFilters),
    enabled: enabled && !!contactId,
  });

  return {
    estimates: estimatesQuery.data?.items ?? [],
    invoices: invoicesQuery.data?.items ?? [],
    payments: paymentsQuery.data?.items ?? [],
    isLoading:
      estimatesQuery.isLoading ||
      invoicesQuery.isLoading ||
      paymentsQuery.isLoading,
  };
}
