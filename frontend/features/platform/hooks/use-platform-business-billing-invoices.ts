import { useInfiniteQuery } from "@tanstack/react-query";
import { listPlatformBusinessBillingInvoices } from "@/features/platform/api/business-access.api";
import type { ListBusinessBillingInvoicesQuery } from "@/features/settings/api/business-billing.api";
import { queryKeys } from "@/lib/query/keys";

export function usePlatformBusinessBillingInvoices(
  businessId: string,
  filters: ListBusinessBillingInvoicesQuery = {},
) {
  return useInfiniteQuery({
    queryKey: queryKeys.platform.businesses.billingInvoices(businessId, filters),
    queryFn: ({ pageParam }) =>
      listPlatformBusinessBillingInvoices(businessId, {
        ...filters,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  });
}
