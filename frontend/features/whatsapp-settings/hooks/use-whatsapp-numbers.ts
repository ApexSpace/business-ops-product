"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getWhatsAppOverview,
  listWhatsAppNumbers,
} from "@/features/whatsapp-settings/api/whatsapp-numbers.api";
import { queryKeys } from "@/lib/query/keys";

export function useWhatsAppNumbers() {
  const overviewQuery = useQuery({
    queryKey: queryKeys.whatsappSettings.overview(),
    queryFn: () => getWhatsAppOverview(),
  });

  const numbersQuery = useQuery({
    queryKey: queryKeys.whatsappSettings.numbers(),
    queryFn: () => listWhatsAppNumbers(),
    enabled: overviewQuery.data?.connected === true,
  });

  return {
    overview: overviewQuery.data,
    numbers: numbersQuery.data ?? [],
    isLoading: overviewQuery.isLoading || numbersQuery.isLoading,
    isConnected: overviewQuery.data?.connected === true,
  };
}
