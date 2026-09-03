"use client";

import { useQuery } from "@tanstack/react-query";
import { getPrimaryPaymentAccount } from "@/features/payment-accounts/api/payment-accounts.api";
import { queryKeys } from "@/lib/query/keys";

export function usePrimaryPaymentAccount() {
  return useQuery({
    queryKey: queryKeys.paymentAccounts.primary(),
    queryFn: getPrimaryPaymentAccount,
    staleTime: 30_000,
  });
}
