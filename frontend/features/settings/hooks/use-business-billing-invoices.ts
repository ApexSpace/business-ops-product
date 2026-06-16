import { useInfiniteQuery } from "@tanstack/react-query";
import {
  listBusinessBillingInvoices,
  type ListBusinessBillingInvoicesQuery,
} from "@/features/settings/api/business-billing.api";
import { queryKeys } from "@/lib/query/keys";

export function useBusinessBillingInvoices(
  filters: ListBusinessBillingInvoicesQuery = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.business.billingInvoices(filters),
    queryFn: ({ pageParam }) =>
      listBusinessBillingInvoices({
        ...filters,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  });
}
