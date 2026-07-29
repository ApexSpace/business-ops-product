"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContactSetupIntent,
  detachContactPaymentMethod,
  listContactPaymentMethods,
} from "@/features/payments/api/contact-payment-methods.api";
import { queryKeys } from "@/lib/query/keys";

export function useContactPaymentMethods(contactId: string | undefined) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: queryKeys.payments.contactMethods(contactId ?? ""),
    queryFn: () => listContactPaymentMethods(contactId!),
    enabled: !!contactId,
  });

  const setupIntentMutation = useMutation({
    mutationFn: () => createContactSetupIntent(contactId!),
  });

  const detachMutation = useMutation({
    mutationFn: (methodId: string) =>
      detachContactPaymentMethod(contactId!, methodId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.payments.contactMethods(contactId ?? ""),
      });
    },
  });

  return {
    methods: listQuery.data?.items ?? [],
    isLoading: listQuery.isLoading,
    createSetupIntent: setupIntentMutation.mutateAsync,
    setupIntentPending: setupIntentMutation.isPending,
    detach: detachMutation.mutateAsync,
    detachPending: detachMutation.isPending,
  };
}

export function formatSavedCardLabel(method: {
  brand?: string | null;
  last4?: string | null;
}) {
  const brand = method.brand?.trim() || "Card";
  const last4 = method.last4?.trim();
  return last4 ? `${brand} ···· ${last4}` : brand;
}
