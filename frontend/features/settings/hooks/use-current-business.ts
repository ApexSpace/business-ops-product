"use client";

import { useQuery } from "@tanstack/react-query";
import { getCurrentBusiness } from "@/features/settings/api/business.api";
import { queryKeys } from "@/lib/query/keys";

export function useCurrentBusiness() {
  return useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: getCurrentBusiness,
  });
}
