import type { QueryClient } from "@tanstack/react-query";
import type { Checkout } from "@/features/sales/types/checkout";
import { queryKeys } from "@/lib/query/keys";

/** Apply a checkout mutation response to the detail cache immediately. */
export function seedCheckoutCache(
  queryClient: QueryClient,
  checkout: Checkout,
) {
  queryClient.setQueryData(queryKeys.checkouts.detail(checkout.id), checkout);
}
