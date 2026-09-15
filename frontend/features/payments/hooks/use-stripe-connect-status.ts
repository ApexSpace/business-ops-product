"use client";

import { useQuery } from "@tanstack/react-query";
import { getStripeConnectContext } from "@/features/payments/api/payment-collection.api";
import { queryKeys } from "@/lib/query/keys";

/** Stripe Connect readiness for card collection (staff POS / embedded pay). */
export function useStripeConnectStatus() {
  const query = useQuery({
    queryKey: queryKeys.payments.stripeContext(),
    queryFn: getStripeConnectContext,
    staleTime: 60_000,
  });

  return {
    ...query,
    ready: query.data?.ready === true,
    publishableKey: query.data?.publishableKey ?? null,
    stripeAccountId: query.data?.stripeAccountId ?? null,
  };
}
