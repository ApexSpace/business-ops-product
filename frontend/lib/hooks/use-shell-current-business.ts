"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";
import type { Business } from "@/lib/types/api";

export function getCurrentBusinessShell() {
  return api.get<Business>("businesses/current");
}

export function useShellCurrentBusiness(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: getCurrentBusinessShell,
    enabled: options?.enabled ?? true,
  });
}
