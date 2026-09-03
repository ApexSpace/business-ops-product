"use client";

import { useQuery } from "@tanstack/react-query";
import { getCheckoutAdvancedSettings } from "@/features/checkout-advanced-settings/api/checkout-advanced-settings.api";
import { queryKeys } from "@/lib/query/keys";

export function useCheckoutAdvancedSettings() {
  return useQuery({
    queryKey: queryKeys.checkoutAdvancedSettings.detail(),
    queryFn: getCheckoutAdvancedSettings,
  });
}
